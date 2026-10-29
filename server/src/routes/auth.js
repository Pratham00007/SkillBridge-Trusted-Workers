import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import WorkerProfile from '../models/WorkerProfile.js';
import { asyncH, validate } from '../middleware/error.js';
import { requireAuth } from '../middleware/auth.js';
import { setAuthCookie, clearAuthCookie } from '../utils/token.js';

const router = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50, standardHeaders: true, legacyHeaders: false });

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  phone: z.string().min(8).max(15).optional(),
  password: z.string().min(8).max(100),
  role: z.enum(['customer', 'worker']), // admin can never self-register
});

router.post('/register', limiter, validate(registerSchema), asyncH(async (req, res) => {
  const { name, email, phone, password, role } = req.body;
  if (await User.findOne({ email })) return res.status(409).json({ message: 'Email already registered' });
  const user = await User.create({ name, email, phone, role, passwordHash: await bcrypt.hash(password, 10) });
  if (role === 'worker') await WorkerProfile.create({ user: user._id });
  setAuthCookie(res, user);
  res.status(201).json({ user: { id: user._id, name, email, role } });
}));

router.post('/login', limiter, validate(z.object({ email: z.string().email(), password: z.string().min(1) })), asyncH(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
    return res.status(401).json({ message: 'Wrong email or password' });
  }
  if (user.accountStatus !== 'active') return res.status(403).json({ message: 'Account suspended. Contact support.' });
  setAuthCookie(res, user);
  res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role } });
}));

router.post('/logout', (req, res) => { clearAuthCookie(res); res.json({ ok: true }); });

router.get('/me', requireAuth, (req, res) => {
  const u = req.user;
  res.json({ user: { id: u._id, name: u.name, email: u.email, phone: u.phone, role: u.role } });
});

export default router;
