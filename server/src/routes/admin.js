import { Router } from 'express';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import VerificationRecord from '../models/VerificationRecord.js';
import WorkerProfile from '../models/WorkerProfile.js';
import Complaint from '../models/Complaint.js';
import Review from '../models/Review.js';
import User from '../models/User.js';
import { asyncH, validate } from '../middleware/error.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { recomputeWorkerStats } from '../utils/stats.js';
import { PRIV } from './workers.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/overview', asyncH(async (req, res) => {
  const [workers, verifiedWorkers, pendingVerifications, openComplaints] = await Promise.all([
    WorkerProfile.countDocuments(),
    WorkerProfile.countDocuments({ 'verification.identity.status': 'verified' }),
    VerificationRecord.countDocuments({ status: 'pending' }),
    Complaint.countDocuments({ status: { $in: ['open', 'under_review'] } }),
  ]);
  res.json({ workers, verifiedWorkers, pendingVerifications, openComplaints });
}));

router.get('/verifications', asyncH(async (req, res) => {
  const status = req.query.status || 'pending';
  const list = await VerificationRecord.find({ status }).sort('createdAt').select('-documentPath').populate({ path: 'worker', select: 'category city user', populate: { path: 'user', select: 'name email' } });
  res.json({ verifications: list });
}));

// Documents are streamed only to admins, never served as static files.
router.get('/verifications/:id/document', asyncH(async (req, res) => {
  const r = await VerificationRecord.findById(req.params.id);
  if (!r?.documentPath) return res.status(404).json({ message: 'No document' });
  const file = path.resolve(r.documentPath);
  if (!file.startsWith(PRIV) || !fs.existsSync(file)) return res.status(404).json({ message: 'File missing' });
  res.sendFile(file);
}));

router.patch('/verifications/:id', validate(z.object({
  decision: z.enum(['verified', 'rejected']),
  note: z.string().max(300).optional(),
  validMonths: z.number().int().min(1).max(60).optional(),
})), asyncH(async (req, res) => {
  const r = await VerificationRecord.findById(req.params.id);
  if (!r || r.status !== 'pending') return res.status(400).json({ message: 'Request not pending' });
  const now = new Date();
  const expiry = new Date(now); expiry.setMonth(expiry.getMonth() + (req.body.validMonths || 12));
  r.status = req.body.decision; r.reviewedBy = req.user._id; r.reviewNote = req.body.note; r.checkedAt = now;
  if (req.body.decision === 'verified') r.expiryDate = expiry;
  await r.save();

  const p = await WorkerProfile.findById(r.worker);
  p.verification[r.checkType].status = req.body.decision;
  if (req.body.decision === 'verified') {
    p.verification[r.checkType].verifiedAt = now;
    p.verification[r.checkType].expiresAt = expiry;
  }
  if (r.checkType === 'skills') p.verification.skills.note = req.body.note;
  if (r.checkType === 'background') p.verification.background.isMock = r.isMock;
  await p.save();
  // Privacy: sensitive document can be deleted once decision is made (data minimisation)
  if (r.documentPath && fs.existsSync(r.documentPath)) { fs.unlink(r.documentPath, () => {}); r.documentPath = undefined; await r.save(); }
  res.json({ ok: true });
}));

router.get('/complaints', asyncH(async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : { status: { $in: ['open', 'under_review'] } };
  const list = await Complaint.find(filter).sort('-createdAt').populate('reporter', 'name email').populate({ path: 'against', select: 'category user', populate: { path: 'user', select: 'name' } });
  res.json({ complaints: list });
}));

router.patch('/complaints/:id', validate(z.object({ status: z.enum(['under_review', 'resolved', 'dismissed']), resolution: z.string().max(1000).optional() })), asyncH(async (req, res) => {
  const c = await Complaint.findByIdAndUpdate(req.params.id, { ...req.body, resolvedBy: req.user._id }, { new: true });
  if (!c) return res.status(404).json({ message: 'Not found' });
  await recomputeWorkerStats(c.against);
  res.json({ complaint: c });
}));

router.patch('/users/:id/status', validate(z.object({ accountStatus: z.enum(['active', 'suspended']) })), asyncH(async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u || u.role === 'admin') return res.status(400).json({ message: 'Cannot change this user' });
  u.accountStatus = req.body.accountStatus; await u.save();
  res.json({ ok: true });
}));

router.get('/workers', asyncH(async (req, res) => {
  const list = await WorkerProfile.find().populate('user', 'name email accountStatus').sort('-createdAt').limit(200);
  res.json({ workers: list.map((p) => ({ id: p._id, userId: p.user._id, name: p.user.name, email: p.user.email, accountStatus: p.user.accountStatus, category: p.category, city: p.city, verification: { identity: p.verification.identity.status, skills: p.verification.skills.status, background: p.verification.background.status }, stats: p.stats })) });
}));

router.patch('/reviews/:id', validate(z.object({ moderationStatus: z.enum(['visible', 'flagged', 'removed']) })), asyncH(async (req, res) => {
  const r = await Review.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!r) return res.status(404).json({ message: 'Not found' });
  await recomputeWorkerStats(r.worker);
  res.json({ ok: true });
}));

export default router;
