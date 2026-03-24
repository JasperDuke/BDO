import { Router } from 'express';
import { requireAuth } from '../middleware/authJwt.js';
import { ArtemisRecord } from '../models/ArtemisRecord.js';
import { escapeRegex } from '../utils/escapeRegex.js';

export const artemisPublicRouter = Router();

// No auth for now — register before requireAuth.
// POST /api/artemis/all?entitytype=individual|corporate — omit entitytype for all. Values must be lowercase.
artemisPublicRouter.post('/all', async (req, res) => {
  try {
    const v = String(req.query.entitytype ?? '').trim().toLowerCase();
    const filter = {};
    if (v === 'individual') {
      filter['metadata.entityType'] = 'INDIVIDUAL';
    } else if (v === 'corporate') {
      filter['metadata.entityType'] = 'CORPORATE';
    } else if (v !== '') {
      return res.status(400).json({ message: 'entitytype must be individual, corporate, or omitted.' });
    }
    const items = await ArtemisRecord.find(filter).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load records' });
  }
});

artemisPublicRouter.use(requireAuth);

artemisPublicRouter.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const q = String(req.query.q ?? '').trim();
    const sortField = String(req.query.sortField ?? 'createdAt');
    const sortDir = String(req.query.sortDir ?? 'desc').toLowerCase() === 'asc' ? 1 : -1;

    const allowedSort = new Set([
      'createdAt',
      'metadata.caseId',
      'metadata.customerId',
      'metadata.caseStatus',
      'metadata.approvalStatus',
      'metadata.riskRating',
      'metadata.entityType',
      'entityInformation.generalDetails.name',
      'entityInformation.generalDetails.emailAddress',
      'riskAssessment.totalRiskScorePercentage',
    ]);
    const sortKey = allowedSort.has(sortField) ? sortField : 'createdAt';

    const filter = {};
    if (q) {
      filter._searchText = new RegExp(escapeRegex(q), 'i');
    }

    const [items, total] = await Promise.all([
      ArtemisRecord.find(filter)
        .sort({ [sortKey]: sortDir })
        .skip(skip)
        .limit(limit)
        .lean(),
      ArtemisRecord.countDocuments(filter),
    ]);

    res.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load records' });
  }
});

artemisPublicRouter.get('/:id', async (req, res) => {
  const doc = await ArtemisRecord.findById(req.params.id).lean();
  if (!doc) return res.status(404).json({ message: 'Record not found' });
  res.json(doc);
});
