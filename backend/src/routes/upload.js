import { Router } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { requireAuth } from "../middleware/authJwt.js";
import { triggerAgentOnProposalSubmit } from "../utils/webhook.js";
import { ProcessingJob } from "../models/ProcessingJob.js";
import { createProcessingEventId } from "./processingJobs.js";
import {
  extractXlsxAllSheets,
  isPdfFile,
  isXlsxFile,
  isMdFile,
} from "../utils/excelExtract.js";
import {
  getUploadFileKind,
  isAllowedUploadFileName,
  uploadFileNameValidationMessage,
} from "../utils/uploadFileName.js";

export const uploadRouter = Router();

/** Multer’s client original name (falls back to stored filename). */
function uploadedOriginalName(f) {
  return String(f.originalname || f.filename || "").trim() || "unknown";
}

const ALLOWED_MIMES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/markdown",
]);

function uploadsRoot() {
  return path.join(process.cwd(), "public", "uploads");
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const userId = req.user._id.toString();
    const dir = path.join(uploadsRoot(), userId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const safe = file.originalname.replace(/[^\w.\-()+ ]/g, "_");
    const unique = `${Date.now()}_${safe}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const okMime = ALLOWED_MIMES.has(file.mimetype);
    const okExt = ext === ".pdf" || ext === ".xlsx" || ext === ".md";
    if (!okMime && !okExt) {
      return cb(new Error("Only PDF, XLSX and MD files are allowed"));
    }

    const originalName = uploadedOriginalName(file);
    const fileKind = getUploadFileKind(originalName, file.mimetype);
    if (!fileKind) {
      return cb(new Error("Only PDF, XLSX and MD files are allowed"));
    }

    if (!isAllowedUploadFileName(originalName, fileKind)) {
      return cb(
        new Error(
          `"${originalName}" is not allowed. ${uploadFileNameValidationMessage(fileKind)}`,
        ),
      );
    }

    cb(null, true);
  },
});

uploadRouter.use(requireAuth);

uploadRouter.post("/", (req, res) => {
  upload.array("files", 20)(req, res, async (err) => {
    if (err) {
      if (err.message === "Only PDF, XLSX and MD files are allowed") {
        return res.status(400).json({ message: err.message });
      }
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ message: "File too large" });
        }
        return res
          .status(400)
          .json({ message: err.message || "Upload failed" });
      }
      return res.status(400).json({ message: err.message || "Upload failed" });
    }

    const files = req.files ?? [];
    if (!files.length) {
      return res.status(400).json({ message: "No files provided" });
    }

    const notificationEmail = String(req.body?.notificationEmail ?? "")
      .trim()
      .toLowerCase();
    if (
      !notificationEmail ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notificationEmail)
    ) {
      return res.status(400).json({
        message:
          "A valid notification email is required so results can be sent after processing.",
      });
    }

    const fileList = Array.isArray(files) ? files : [];

    /**
     * Records enabled: webhook `attachments` = PDF and MD URLs only; xlsx content only in `extractedExcelData`.
     * Records disabled: `attachments` = all files (pdf + md + xlsx); no extraction.
     */
    const showRecords = req.user.showRecordsTab !== false;

    let extractedExcelData;
    let attachmentFilePaths;

    if (showRecords) {
      extractedExcelData = [];
      for (const f of fileList) {
        if (!isXlsxFile(f)) continue;
        try {
          const sheets = extractXlsxAllSheets(f.path);
          /** Nest under `sheets` so a tab name can never overwrite `originalFileName`. */
          extractedExcelData.push({
            originalFileName: uploadedOriginalName(f),
            sheets,
          });
        } catch (e) {
          console.error(
            "[upload] xlsx extract failed:",
            uploadedOriginalName(f),
            e,
          );
          extractedExcelData.push({
            originalFileName: uploadedOriginalName(f),
            error: String(e?.message || e),
          });
        }
      }
      if (extractedExcelData.length === 0) {
        extractedExcelData = undefined;
      }
      attachmentFilePaths = fileList
        .filter((f) => isPdfFile(f) || isMdFile(f))
        .map((f) => f.path);
    } else {
      extractedExcelData = undefined;
      attachmentFilePaths = fileList.map((f) => f.path);
    }

    const eventId = createProcessingEventId();
    const userId = req.user._id.toString();
    const uploadedFiles = fileList.map((f) => ({
      originalname: f.originalname,
      filename: f.filename,
      size: f.size,
      mimetype: f.mimetype,
    }));

    const job = await ProcessingJob.create({
      userId: req.user._id,
      eventId,
      userName: req.user.name || "",
      notificationEmail,
      status: "processing",
      uploadedFiles,
      webhookTriggered: false,
    });

    console.log("[upload] Processing job created", {
      eventId,
      jobId: job._id.toString(),
      userId,
      userEmail: req.user.email,
      userName: req.user.name || "",
      uploadedFiles: uploadedFiles.map((f) => f.originalname),
      notificationEmail,
    });

    const webhookBody = {
      notificationEmail,
      attachmentFilePaths,
      userId,
      eventId,
      ...(extractedExcelData?.length ? { extractedExcelData } : {}),
    };

    let webhookResult;
    try {
      webhookResult = await triggerAgentOnProposalSubmit(webhookBody);
      if (webhookResult?.skipped) {
        job.status = "failed";
        job.errorMessage =
          "No agent trigger is configured. Set up Temporal Trigger or environment variables.";
        job.completedAt = new Date();
        await job.save();
        return res.status(503).json({
          message: job.errorMessage,
          job: {
            id: job._id.toString(),
            eventId: job.eventId,
            status: job.status,
          },
        });
      }
      job.webhookTriggered = true;
      await job.save();
    } catch (webhookErr) {
      job.status = "failed";
      job.errorMessage =
        webhookErr.response?.data?.message ||
        webhookErr.message ||
        "Failed to trigger processing agent";
      job.completedAt = new Date();
      await job.save();
      return res.status(502).json({
        message: job.errorMessage,
        job: {
          id: job._id.toString(),
          eventId: job.eventId,
          status: job.status,
        },
      });
    }

    res.status(201).json({
      ok: true,
      job: {
        id: job._id.toString(),
        eventId: job.eventId,
        status: job.status,
      },
      notificationEmail,
      files: uploadedFiles,
      fileCount: fileList.length,
      uploadedAt: new Date().toISOString(),
      webhook: webhookResult,
      extractedExcelData,
      attachmentFilePaths,
    });
  });
});
