import { Router } from 'express';
import { requireAuth } from '../middleware/authJwt.js';
import {
  ArtemisRecord,
  applyEntityTypeRules,
  buildSearchText,
} from '../models/ArtemisRecord.js';
import { escapeRegex } from '../utils/escapeRegex.js';

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
    const body = applyEntityTypeRules(req.body);
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

artemisInternalRouter.put('/:id', async (req, res) => {
  try {
    const body = applyEntityTypeRules(req.body);
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
