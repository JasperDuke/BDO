import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { requireAuth } from '../middleware/authJwt.js';
import { User } from '../models/User.js';

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get('/me', async (req, res) => {
  const user = await User.findById(req.user._id).select('-passwordHash');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

usersRouter.get('/', async (req, res) => {
  const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
  res.json(users);
});

usersRouter.get('/:id', async (req, res) => {
  const user = await User.findById(req.params.id).select('-passwordHash');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

usersRouter.post('/', async (req, res) => {
  try {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');
    const name = String(req.body?.name ?? '').trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Valid email is required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already in use' });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ email, passwordHash, name });
    res.status(201).json(await User.findById(user._id).select('-passwordHash'));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not create user' });
  }
});

usersRouter.patch('/:id', async (req, res) => {
  try {
    const updates = {};
    if (req.body.name !== undefined) updates.name = String(req.body.name).trim();
    if (req.body.email !== undefined) {
      const email = String(req.body.email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ message: 'Valid email is required' });
      }
      const clash = await User.findOne({ email, _id: { $ne: req.params.id } });
      if (clash) return res.status(409).json({ message: 'Email already in use' });
      updates.email = email;
    }
    if (req.body.password !== undefined) {
      const password = String(req.body.password);
      if (password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters' });
      }
      updates.passwordHash = await bcrypt.hash(password, 12);
    }
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-passwordHash');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not update user' });
  }
});

usersRouter.delete('/:id', async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.status(204).send();
});
