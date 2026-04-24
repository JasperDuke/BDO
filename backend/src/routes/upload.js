import { Router } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { requireAuth } from "../middleware/authJwt.js";
import { triggerAgentOnProposalSubmit } from "../utils/webhook.js";
import {
  extractXlsxAllSheets,
  isPdfFile,
  isXlsxFile,
  isMdFile,
} from "../utils/excelExtract.js";

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
    if (okMime || okExt) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, XLSX and MD files are allowed"));
    }
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

    const webhookBody = {
      notificationEmail,
      attachmentFilePaths,
      userId: req.user._id.toString(),
      ...(extractedExcelData?.length ? { extractedExcelData } : {}),
    };

    const webhookResult = await triggerAgentOnProposalSubmit(webhookBody);

    res.status(201).json({
      ok: true,
      notificationEmail,
      files: fileList.map((f) => ({
        originalname: f.originalname,
        filename: f.filename,
        size: f.size,
        mimetype: f.mimetype,
      })),
      fileCount: fileList.length,
      uploadedAt: new Date().toISOString(),
      webhook: webhookResult,
      extractedExcelData,
      attachmentFilePaths,
    });
  });
});
