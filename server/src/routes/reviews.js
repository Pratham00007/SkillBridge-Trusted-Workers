import { Router } from 'express';
import { z } from 'zod';
import Review from '../models/Review.js';
import Booking from '../models/Booking.js';
import { asyncH, validate } from '../middleware/error.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { recomputeWorkerStats } from '../utils/stats.js';

const router = Router();
const s = z.number().int().min(1).max(5);

// Worker/customer ids come from the BOOKING in the DB, never from the request body.
router.post('/', requireAuth, requireRole('customer'), validate(z.object({
  bookingId: z.string().length(24), rating: s, punctuality: s, communication: s, quality: s, estimateAdherence: s,
  feedback: z.string().max(1000).optional(),
})), asyncH(async (req, res) => {
  const b = await Booking.findById(req.body.bookingId);
  if (!b || String(b.customer) !== String(req.user._id)) return res.status(404).json({ message: 'Booking not found' });
  if (b.status !== 'completed') return res.status(400).json({ message: 'You can review only completed bookings' });
  if (b.reviewed) return res.status(409).json({ message: 'Already reviewed' });
  const { bookingId, ...rest } = req.body;
  await Review.create({ ...rest, booking: b._id, customer: req.user._id, worker: b.worker });
  b.reviewed = true;
  await b.save();
  await recomputeWorkerStats(b.worker);
  res.status(201).json({ ok: true });
}));

export default router;
