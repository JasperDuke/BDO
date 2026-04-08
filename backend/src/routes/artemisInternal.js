import { Router } from 'express';
import { requireAuth } from '../middleware/authJwt.js';
import {
  ArtemisRecord,
  applyEntityTypeRules,
  buildSearchText,
} from '../models/ArtemisRecord.js';
import { normalizeArtemisIncomingPayload } from '../utils/artemisExternalFormat.js';
import { escapeRegex } from '../utils/escapeRegex.js';

/** Strip Mongo/export fields so pasted JSON can be re-imported (same as artemis-admin UI). */
function sanitizeArtemisImportPayload(raw) {
  const o =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? JSON.parse(JSON.stringify(raw))
      : {};
  delete o._id;
  delete o.__v;
  delete o._searchText;
  delete o.createdAt;
  delete o.updatedAt;
  return o;
}

export const artemisInternalRouter = Router();
artemisInternalRouter.use(requireAuth);

artemisInternalRouter.get('/', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
  const skip = (page - 1) * limit;
  const q = String(req.query.q ?? '').trim();
  const filter = q ? { _searchText: new RegExp(escapeRegex(q), 'i') } : {};
  const [items, total] = await Promise.all([
    ArtemisRecord.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ArtemisRecord.countDocuments(filter),
  ]);
  res.json({ items, total, page, limit });
});

artemisInternalRouter.get('/:id', async (req, res) => {
  const doc = await ArtemisRecord.findById(req.params.id).lean();
  if (!doc) return res.status(404).json({ message: 'Record not found' });
  res.json(doc);
});

artemisInternalRouter.post('/', async (req, res) => {
  try {
    const body = applyEntityTypeRules(
      normalizeArtemisIncomingPayload(sanitizeArtemisImportPayload(req.body)),
    );
    const doc = new ArtemisRecord(body);
    doc._searchText = buildSearchText(doc);
    await doc.save();
    res.status(201).json(doc.toObject());
  } catch (err) {
    console.error(err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message, details: err.errors });
    }
    res.status(500).json({ message: 'Could not create record' });
  }
});

/** Body: JSON array of records (export or internal shape). Creates each document; continues on per-row errors. */
artemisInternalRouter.post('/bulk', async (req, res) => {
  const list = req.body;
  if (!Array.isArray(list)) {
    return res
      .status(400)
      .json({ message: 'Body must be a JSON array of record objects' });
  }
  if (list.length === 0) {
    return res.status(400).json({ message: 'Array must not be empty' });
  }
  if (list.length > 500) {
    return res
      .status(400)
      .json({ message: 'At most 500 records per request' });
  }

  const created = [];
  const errors = [];

  for (let i = 0; i < list.length; i++) {
    const raw = list[i];
    if (
      raw === null ||
      typeof raw !== 'object' ||
      Array.isArray(raw)
    ) {
      errors.push({
        index: i,
        message: 'Each item must be a JSON object',
      });
      continue;
    }
    try {
      const body = applyEntityTypeRules(
        normalizeArtemisIncomingPayload(sanitizeArtemisImportPayload(raw)),
      );
      const doc = new ArtemisRecord(body);
      doc._searchText = buildSearchText(doc);
      await doc.save();
      created.push(doc.toObject());
    } catch (err) {
      console.error(err);
      const message =
        err.name === 'ValidationError' ? err.message : 'Could not create record';
      errors.push({ index: i, message });
    }
  }

  const status =
    created.length === 0 ? 400 : errors.length === 0 ? 201 : 207;
  res.status(status).json({
    created,
    errors,
    count: created.length,
  });
});

artemisInternalRouter.put('/:id', async (req, res) => {
  try {
    const body = applyEntityTypeRules(normalizeArtemisIncomingPayload(req.body));
    const doc = await ArtemisRecord.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Record not found' });
    doc.set(body);
    doc._searchText = buildSearchText(doc);
    await doc.save();
    res.json(doc.toObject());
  } catch (err) {
    console.error(err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({ message: err.message, details: err.errors });
    }
    res.status(500).json({ message: 'Could not update record' });
  }
});

artemisInternalRouter.delete('/:id', async (req, res) => {
  const doc = await ArtemisRecord.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ message: 'Record not found' });
  res.status(204).send();
});
