import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import Booking from '../models/Booking.js';
import WorkerProfile from '../models/WorkerProfile.js';
import { asyncH, validate } from '../middleware/error.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { recomputeWorkerStats } from '../utils/stats.js';

const router = Router();
router.use(requireAuth);

const createSchema = z.object({
  workerId: z.string().length(24),
  service: z.string().min(2).max(80),
  description: z.string().max(1000).optional(),
  scheduledAt: z.string().refine((d) => !isNaN(Date.parse(d)) && new Date(d) > new Date(), 'Pick a future date and time'),
  address: z.string().min(5).max(300),
  city: z.string().max(60).optional(),
  estimateAmount: z.number().min(0),
});

// Customer creates booking request; estimate = worker's published min rate unless customer-agreed amount provided
router.post('/', requireRole('customer'), validate(createSchema), asyncH(async (req, res) => {
  const b = req.body;
  const worker = await WorkerProfile.findOne({ _id: b.workerId, isPublished: true });
  if (!worker) return res.status(404).json({ message: 'Worker not available' });
  const booking = await Booking.create({
    customer: req.user._id, worker: worker._id, service: b.service, description: b.description,
    scheduledAt: b.scheduledAt, address: b.address, city: b.city || worker.city, estimate: { amount: b.estimateAmount },
    arrivalCode: String(crypto.randomInt(1000, 10000)),
  });
  res.status(201).json({ booking });
}));

const shape = (b, role) => {
  const o = b.toObject();
  // arrivalCode visible only to the customer; worker must ask for it at the door
  if (role !== 'customer') delete o.arrivalCode;
  return o;
};

router.get('/me', asyncH(async (req, res) => {
  let filter;
  if (req.user.role === 'worker') {
    const wp = await WorkerProfile.findOne({ user: req.user._id });
    filter = { worker: wp._id };
  } else if (req.user.role === 'customer') filter = { customer: req.user._id };
  else return res.status(403).json({ message: 'Use admin panel' });
  const list = await Booking.find(filter).sort('-createdAt').populate('customer', 'name phone').populate({ path: 'worker', select: 'headline category photoUrl user', populate: { path: 'user', select: 'name phone' } });
  // phone numbers shared only after a booking is accepted
  const out = list.map((b) => {
    const o = shape(b, req.user.role);
    const shared = ['accepted', 'in_progress', 'completed'].includes(b.status);
    if (!shared) { if (o.customer) delete o.customer.phone; if (o.worker?.user) delete o.worker.user.phone; }
    return o;
  });
  res.json({ bookings: out });
}));

async function loadForParticipant(req) {
  const b = await Booking.findById(req.params.id);
  if (!b) return {};
  const wp = await WorkerProfile.findOne({ user: req.user._id });
  const isCustomer = String(b.customer) === String(req.user._id);
  const isWorker = wp && String(b.worker) === String(wp._id);
  return { b, isCustomer, isWorker };
}

// Status lifecycle with per-role rules (enforced server-side)
router.patch('/:id/status', validate(z.object({ status: z.enum(['accepted', 'rejected', 'in_progress', 'completed', 'cancelled']), arrivalCode: z.string().optional(), finalAmount: z.number().min(0).optional(), notes: z.string().max(500).optional() })), asyncH(async (req, res) => {
  const { b, isCustomer, isWorker } = await loadForParticipant(req);
  if (!b || (!isCustomer && !isWorker)) return res.status(404).json({ message: 'Booking not found' });
  const { status, arrivalCode, finalAmount, notes } = req.body;
  const cur = b.status;
  const bad = (m) => res.status(400).json({ message: m });

  if (status === 'accepted' || status === 'rejected') {
    if (!isWorker || cur !== 'requested') return bad('Only the worker can accept/reject a new request');
  } else if (status === 'in_progress') {
    if (!isWorker || cur !== 'accepted') return bad('Only the worker can start an accepted booking');
    if (arrivalCode !== b.arrivalCode) return bad('Wrong arrival code. Ask the customer for the 4-digit code.');
  } else if (status === 'completed') {
    if (!isWorker || cur !== 'in_progress') return bad('Only the worker can complete a job in progress');
    if (b.revision.status === 'pending') return bad('Customer has not yet approved the revised estimate');
    b.completion = { completedAt: new Date(), finalAmount: finalAmount ?? (b.revision.status === 'approved' ? b.revision.amount : b.estimate.amount), notes };
  } else if (status === 'cancelled') {
    if (!['requested', 'accepted'].includes(cur)) return bad('Cannot cancel at this stage');
  }
  b.status = status;
  await b.save();
  if (status === 'completed') await recomputeWorkerStats(b.worker);
  res.json({ booking: shape(b, req.user.role) });
}));

// Worker proposes extra charges, customer must approve before work continues
router.post('/:id/revision', validate(z.object({ amount: z.number().min(0), reason: z.string().min(5).max(300) })), asyncH(async (req, res) => {
  const { b, isWorker } = await loadForParticipant(req);
  if (!b || !isWorker) return res.status(404).json({ message: 'Booking not found' });
  if (b.status !== 'in_progress') return res.status(400).json({ message: 'Revised estimate allowed only while job is in progress' });
  b.revision = { amount: req.body.amount, reason: req.body.reason, status: 'pending' };
  await b.save();
  res.json({ booking: shape(b, req.user.role) });
}));

router.patch('/:id/revision', validate(z.object({ decision: z.enum(['approved', 'declined']) })), asyncH(async (req, res) => {
  const { b, isCustomer } = await loadForParticipant(req);
  if (!b || !isCustomer) return res.status(404).json({ message: 'Booking not found' });
  if (b.revision.status !== 'pending') return res.status(400).json({ message: 'No pending revision' });
  b.revision.status = req.body.decision;
  await b.save();
  res.json({ booking: shape(b, req.user.role) });
}));

export default router;
