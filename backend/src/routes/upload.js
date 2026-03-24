import { Router } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { requireAuth } from "../middleware/authJwt.js";
import { triggerAgentOnProposalSubmit } from "../utils/webhook.js";

export const uploadRouter = Router();

const ALLOWED_MIMES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const okMime = ALLOWED_MIMES.has(file.mimetype);
    const okExt = ext === ".pdf" || ext === ".xlsx";
    if (okMime || okExt) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and XLSX files are allowed"));
    }
  },
});

uploadRouter.use(requireAuth);

uploadRouter.post("/", (req, res) => {
  upload.array("files", 20)(req, res, async (err) => {
    if (err) {
      if (err.message === "Only PDF and XLSX files are allowed") {
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

    const webhookBody = {
      notificationEmail,
      attachmentFilePaths: fileList.map((f) =>
        path.join(req.user._id.toString(), f.path),
      ),
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
    });
  });
});
