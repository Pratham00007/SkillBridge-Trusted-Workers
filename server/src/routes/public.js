import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import WorkerProfile from '../models/WorkerProfile.js';
import Review from '../models/Review.js';
import { asyncH } from '../middleware/error.js';
import { toPublicWorker } from '../utils/trust.js';

const router = Router();
const scanLimiter = rateLimit({ windowMs: 60 * 1000, max: 60 });

// What anyone sees after scanning a worker's QR card. LIVE data, so a stale/forged card cannot show fake status.
// No phone / email / home address are exposed here: contact happens through bookings.
router.get('/w/:token', scanLimiter, asyncH(async (req, res) => {
  const p = await WorkerProfile.findOneAndUpdate({ qrToken: req.params.token }, { $inc: { qrScans: 1 } }, { new: true }).populate('user', 'name accountStatus');
  if (!p || p.user.accountStatus !== 'active') {
    return res.status(404).json({ message: 'This card is invalid, expired or the account is suspended.' });
  }
  const reviews = await Review.find({ worker: p._id, moderationStatus: 'visible' }).sort('-createdAt').limit(5).populate('customer', 'name');
  res.json({
    worker: toPublicWorker(p),
    isPublished: p.isPublished,
    reviews: reviews.map((r) => ({ rating: r.rating, feedback: r.feedback, customer: r.customer.name.split(' ')[0], createdAt: r.createdAt })),
  });
}));

export default router;
