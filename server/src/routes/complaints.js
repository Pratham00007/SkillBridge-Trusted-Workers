import { Router } from 'express';
import { z } from 'zod';
import Complaint from '../models/Complaint.js';
import Booking from '../models/Booking.js';
import WorkerProfile from '../models/WorkerProfile.js';
import { asyncH, validate } from '../middleware/error.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { recomputeWorkerStats } from '../utils/stats.js';

const router = Router();
router.use(requireAuth);

router.post('/', requireRole('customer'), validate(z.object({
  bookingId: z.string().length(24).optional(),
  workerId: z.string().length(24).optional(), // used for QR-scan reports ("fake profile")
  category: z.enum(['poor_quality', 'extra_charges', 'no_show', 'misconduct', 'safety', 'fake_profile', 'other']),
  description: z.string().min(10).max(2000),
})), asyncH(async (req, res) => {
  let workerId = req.body.workerId, bookingId;
  if (req.body.bookingId) {
    const b = await Booking.findById(req.body.bookingId);
    if (!b || String(b.customer) !== String(req.user._id)) return res.status(404).json({ message: 'Booking not found' });
    workerId = b.worker; bookingId = b._id;
  }
  if (!workerId || !(await WorkerProfile.exists({ _id: workerId }))) return res.status(400).json({ message: 'Worker/booking required' });
  const c = await Complaint.create({ booking: bookingId, reporter: req.user._id, against: workerId, category: req.body.category, description: req.body.description });
  await recomputeWorkerStats(workerId);
  res.status(201).json({ complaint: c });
}));

router.get('/me', asyncH(async (req, res) => {
  const list = await Complaint.find({ reporter: req.user._id }).sort('-createdAt').select('-resolvedBy');
  res.json({ complaints: list });
}));

export default router;
