import { Router } from 'express';
import crypto from 'node:crypto';
import { requireAuth } from '../middleware/authJwt.js';
import {
  ProcessingJob,
  PROCESSING_TIMEOUT_MS,
} from '../models/ProcessingJob.js';
import { User } from '../models/User.js';
import {
  deleteStoredResultFiles,
  downloadResultFile,
  resultFilePaths,
} from '../utils/resultFiles.js';

export const processingJobsRouter = Router();

function serializeJob(doc, baseUrl) {
  const userId = doc.userId.toString();

  let resultPdfUrl = null;
  let resultXlsxUrl = null;

  if (doc.status === 'completed') {
    if (doc.resultPdfFilename) {
      resultPdfUrl = `${baseUrl}/uploads/${userId}/results/${doc.resultPdfFilename}`;
    } else if (doc.resultPdfUrl) {
      resultPdfUrl = doc.resultPdfUrl;
    }
    if (doc.resultXlsxFilename) {
      resultXlsxUrl = `${baseUrl}/uploads/${userId}/results/${doc.resultXlsxFilename}`;
    } else if (doc.resultXlsxUrl) {
      resultXlsxUrl = doc.resultXlsxUrl;
    }
  }

  return {
    id: doc._id.toString(),
    eventId: doc.eventId,
    userId,
    userName: doc.userName || '',
    notificationEmail: doc.notificationEmail,
    status: doc.status,
    uploadedFiles: doc.uploadedFiles,
    resultPdfUrl,
    resultXlsxUrl,
    errorMessage: doc.errorMessage || '',
    webhookTriggered: doc.webhookTriggered,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    completedAt: doc.completedAt,
  };
}

function publicBaseUrl() {
  return (process.env.API_PUBLIC_URL || '').replace(/\/$/, '');
}

async function applyStaleTimeout(job) {
  if (job.status !== 'processing') return job;
  const age = Date.now() - new Date(job.createdAt).getTime();
  if (age <= PROCESSING_TIMEOUT_MS) return job;

  job.status = 'failed';
  job.errorMessage =
    job.errorMessage || 'Processing timed out. No result links were received.';
  job.completedAt = new Date();
  await job.save();
  return job;
}

function pickBodyString(body, ...keys) {
  for (const key of keys) {
    const value = String(body?.[key] ?? '').trim();
    if (value) return value;
  }
  return '';
}

function isHttpUrl(value) {
  return /^https?:\/\/.+/i.test(value);
}

function resolveEventId(req) {
  const fromBody = pickBodyString(req.body, 'eventId', 'event_id');
  if (fromBody) return fromBody;
  return String(req.params?.eventId ?? '').trim();
}

/** Agent result callback — POST JSON with eventId + result links (no auth). */
async function handleAgentResult(req, res) {
  const eventId = resolveEventId(req);
  if (!eventId) {
    return res.status(400).json({ message: 'eventId is required in request body' });
  }

  try {
    const job = await ProcessingJob.findOne({ eventId });
    if (!job) {
      console.warn('[processing-jobs] Agent callback — job not found', { eventId });
      return res.status(404).json({ message: 'Processing job not found' });
    }
    if (job.status === 'completed') {
      console.warn('[processing-jobs] Agent callback — job already completed', {
        eventId,
        jobId: job._id.toString(),
      });
      return res.status(409).json({ message: 'Job already completed' });
    }

    const user = await User.findById(job.userId).select('email name').lean();
    const debugBase = {
      eventId,
      jobId: job._id.toString(),
      userId: job.userId.toString(),
      userEmail: user?.email || job.notificationEmail,
      userName: user?.name || job.userName || '',
      uploadedFiles: job.uploadedFiles.map((f) => f.originalname),
    };

    const body = req.body || {};

    if (body.status === 'failed' || body.error) {
      const errorMessage = String(body.error || body.message || 'Processing failed');
      job.status = 'failed';
      job.errorMessage = errorMessage;
      job.completedAt = new Date();
      await job.save();
      console.log('[processing-jobs] Agent reported failure', {
        ...debugBase,
        error: errorMessage,
      });
      return res.json({ ok: true, eventId, status: job.status });
    }

    const pdfUrl = pickBodyString(body, 'pdfUrl', 'pdf_url');
    const xlsxUrl = pickBodyString(body, 'xlsxUrl', 'xlsx_url');

    if (!pdfUrl || !xlsxUrl) {
      console.warn('[processing-jobs] Agent callback — missing links', {
        ...debugBase,
        pdfUrl: pdfUrl || null,
        xlsxUrl: xlsxUrl || null,
      });
      return res.status(400).json({
        message: 'pdfUrl and xlsxUrl are required',
      });
    }
    if (!isHttpUrl(pdfUrl) || !isHttpUrl(xlsxUrl)) {
      console.warn('[processing-jobs] Agent callback — invalid URLs', {
        ...debugBase,
        pdfUrl,
        xlsxUrl,
      });
      return res.status(400).json({
        message: 'pdfUrl and xlsxUrl must be valid http(s) URLs',
      });
    }

    const userId = job.userId.toString();
    const { pdfFilename, xlsxFilename, pdfPath, xlsxPath } = resultFilePaths(
      userId,
      eventId,
    );

    try {
      await Promise.all([
        downloadResultFile(pdfUrl, pdfPath),
        downloadResultFile(xlsxUrl, xlsxPath),
      ]);
    } catch (downloadErr) {
      console.error('[processing-jobs] Agent callback — download failed', {
        ...debugBase,
        pdfUrl,
        xlsxUrl,
        error: downloadErr.message,
      });
      return res.status(502).json({
        message: 'Failed to download result files from provided URLs',
      });
    }

    job.status = 'completed';
    job.resultPdfFilename = pdfFilename;
    job.resultXlsxFilename = xlsxFilename;
    job.resultPdfUrl = '';
    job.resultXlsxUrl = '';
    job.errorMessage = '';
    job.completedAt = new Date();
    await job.save();

    const baseUrl = publicBaseUrl();
    const serialized = serializeJob(job, baseUrl);

    console.log('[processing-jobs] Agent result saved', {
      ...debugBase,
      pdfUrl,
      xlsxUrl,
      resultPdfFilename: pdfFilename,
      resultXlsxFilename: xlsxFilename,
      status: 'completed',
    });

    return res.status(201).json({
      ok: true,
      eventId,
      status: job.status,
      resultPdfUrl: serialized.resultPdfUrl,
      resultXlsxUrl: serialized.resultXlsxUrl,
    });
  } catch (e) {
    console.error('[processing-jobs] result error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
}

processingJobsRouter.post('/result', handleAgentResult);

/** @deprecated Use POST /result with eventId, pdfUrl, and xlsxUrl in JSON body. */
processingJobsRouter.post('/callback/:eventId', handleAgentResult);

processingJobsRouter.use(requireAuth);

/** List current user's processing history (newest first). */
processingJobsRouter.get('/', async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const skip = Math.max(parseInt(req.query.skip, 10) || 0, 0);

    const [rawJobs, total] = await Promise.all([
      ProcessingJob.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ProcessingJob.countDocuments({ userId: req.user._id }),
    ]);

    const baseUrl = publicBaseUrl();
    const jobs = [];
    for (const doc of rawJobs) {
      const job = await applyStaleTimeout(doc);
      jobs.push(serializeJob(job, baseUrl));
    }

    res.json({ jobs, total, limit, skip });
  } catch (e) {
    console.error('[processing-jobs] list error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/** Delete a processing job from history (must belong to user). */
processingJobsRouter.delete('/:id', async (req, res) => {
  try {
    const job = await ProcessingJob.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!job) {
      return res.status(404).json({ message: 'Processing job not found' });
    }

    try {
      await deleteStoredResultFiles(
        job.userId.toString(),
        job.resultPdfFilename,
        job.resultXlsxFilename,
      );
    } catch (fileErr) {
      console.warn('[processing-jobs] Could not delete result files', {
        jobId: job._id.toString(),
        error: fileErr.message,
      });
    }

    console.log('[processing-jobs] History entry deleted', {
      jobId: job._id.toString(),
      eventId: job.eventId,
      userId: job.userId.toString(),
      status: job.status,
    });

    res.json({ ok: true, id: job._id.toString() });
  } catch (e) {
    if (e.name === 'CastError') {
      return res.status(404).json({ message: 'Processing job not found' });
    }
    console.error('[processing-jobs] delete error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/** Poll a single job by Mongo id (must belong to user). */
processingJobsRouter.get('/:id', async (req, res) => {
  try {
    const job = await ProcessingJob.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!job) {
      return res.status(404).json({ message: 'Processing job not found' });
    }

    const updated = await applyStaleTimeout(job);
    res.json(serializeJob(updated, publicBaseUrl()));
  } catch (e) {
    if (e.name === 'CastError') {
      return res.status(404).json({ message: 'Processing job not found' });
    }
    console.error('[processing-jobs] get error:', e);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/** Create event id for upload flow (exported for upload route). */
export function createProcessingEventId() {
  return `demoaml_event_${crypto.randomUUID()}`;
}
