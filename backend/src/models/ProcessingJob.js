import mongoose from 'mongoose';

const uploadedFileSchema = new mongoose.Schema(
  {
    originalname: { type: String, required: true },
    filename: { type: String, required: true },
    size: { type: Number, default: 0 },
    mimetype: { type: String, default: '' },
  },
  { _id: false },
);

const processingJobSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    eventId: { type: String, required: true, unique: true },
    userName: { type: String, trim: true, default: '' },
    notificationEmail: { type: String, required: true, lowercase: true, trim: true },
    status: {
      type: String,
      enum: ['processing', 'completed', 'failed'],
      default: 'processing',
      index: true,
    },
    uploadedFiles: { type: [uploadedFileSchema], default: [] },
    /** External URL to result PDF (agent-provided link) */
    resultPdfUrl: { type: String, default: '' },
    /** External URL to result XLSX (agent-provided link) */
    resultXlsxUrl: { type: String, default: '' },
    /** @deprecated Local filename — legacy jobs before URL-based results */
    resultPdfFilename: { type: String, default: '' },
    errorMessage: { type: String, default: '' },
    webhookTriggered: { type: Boolean, default: false },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

processingJobSchema.index({ userId: 1, createdAt: -1 });

/** Mark stale jobs as failed when polled after PROCESSING_TIMEOUT_MS. */
export const PROCESSING_TIMEOUT_MS = 60 * 60 * 1000;

export const ProcessingJob = mongoose.model('ProcessingJob', processingJobSchema);
