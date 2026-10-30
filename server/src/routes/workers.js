import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import QRCode from 'qrcode';
import WorkerProfile from '../models/WorkerProfile.js';
import Review from '../models/Review.js';
import VerificationRecord from '../models/VerificationRecord.js';
import { asyncH, validate } from '../middleware/error.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { toPublicWorker } from '../utils/trust.js';
import { scoreWorker } from '../utils/matching.js';
import { cloudinaryStorage } from '../utils/cloudinary.js';

const router = Router();

// ---------- uploads ----------
const UP = path.resolve('uploads');            // public (portfolio images)
const PRIV = path.resolve('private_uploads');  // private (ID / certificates) - admin only
[UP, PRIV].forEach((d) => fs.mkdirSync(d, { recursive: true }));

const storage = (dir) => multer.diskStorage({
  destination: dir,
  filename: (req, file, cb) => cb(null, crypto.randomBytes(12).toString('hex') + path.extname(file.originalname).toLowerCase()),
});
const imgOnly = (req, file, cb) => (/^image\/(png|jpe?g|webp)$/.test(file.mimetype) ? cb(null, true) : cb(new Error('Only png/jpg/webp images allowed')));
const docOnly = (req, file, cb) => (/^(image\/(png|jpe?g|webp)|application\/pdf)$/.test(file.mimetype) ? cb(null, true) : cb(new Error('Only images or PDF allowed')));
const uploadPublic = multer({ storage: cloudinaryStorage, limits: { fileSize: 3 * 1024 * 1024 } });
const uploadPrivate = multer({ storage: storage(PRIV), fileFilter: docOnly, limits: { fileSize: 5 * 1024 * 1024 } });

// ---------- search with matching ----------
router.get('/', asyncH(async (req, res) => {
  const { service, city, pincode, date, minRating, verifiedOnly } = req.query;
  const filter = { isPublished: true };
  if (verifiedOnly === 'true') filter['verification.identity.status'] = 'verified';
  if (minRating) filter['stats.ratingAvg'] = { $gte: Number(minRating) };
  const profiles = await WorkerProfile.find(filter).populate({ path: 'user', select: 'name accountStatus', match: { accountStatus: 'active' } }).limit(200);

  const results = profiles
    .filter((p) => p.user)
    .map((p) => {
      const m = scoreWorker(p, { service, city, pincode, date });
      return { ...toPublicWorker(p), match: m };
    })
    .filter((w) => !service || w.match.breakdown.skill > 0) // must have some relevance to the requested service
    .sort((a, b) => b.match.score - a.match.score);
  res.json({ workers: results });
}));

// ---------- own profile (worker) ----------
const profileSchema = z.object({
  headline: z.string().max(120).optional(),
  bio: z.string().max(1000).optional(),
  category: z.string().max(40).optional(),
  skills: z.array(z.object({ name: z.string().min(1).max(40), years: z.number().min(0).max(60) })).max(20).optional(),
  experienceYears: z.number().min(0).max(60).optional(),
  city: z.string().max(60).optional(),
  serviceAreas: z.array(z.string().max(40)).max(30).optional(),
  rate: z.object({ min: z.number().min(0), max: z.number().min(0), note: z.string().max(40).optional() }).optional(),
  availability: z.object({ days: z.array(z.number().min(0).max(6)), startHour: z.number().min(0).max(23), endHour: z.number().min(1).max(24) }).optional(),
  credentials: z.array(z.object({ title: z.string().max(80), issuer: z.string().max(80).optional(), year: z.number().optional() })).max(15).optional(),
  isPublished: z.boolean().optional(),
}).strict(); // unknown keys (like `verification`) are rejected

router.get('/me', requireAuth, requireRole('worker'), asyncH(async (req, res) => {
  const p = await WorkerProfile.findOne({ user: req.user._id }).populate('user', 'name email phone');
  const verifications = await VerificationRecord.find({ worker: p._id }).select('-documentPath').sort('-createdAt');
  res.json({ profile: { ...toPublicWorker(p), isPublished: p.isPublished, qrScans: p.qrScans, qrToken: p.qrToken }, verifications });
}));

router.patch('/me', requireAuth, requireRole('worker'), validate(profileSchema), asyncH(async (req, res) => {
  const p = await WorkerProfile.findOneAndUpdate({ user: req.user._id }, { $set: req.body }, { new: true });
  res.json({ ok: true, isPublished: p.isPublished });
}));

router.post('/me/photo', requireAuth, requireRole('worker'), uploadPublic.single('file'), asyncH(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'File missing' });
  // Cloudinary provides the full HTTPS URL in req.file.path
  await WorkerProfile.findOneAndUpdate({ user: req.user._id }, { photoUrl: req.file.path });
  res.json({ url: req.file.path });
}));

router.post('/me/portfolio', requireAuth, requireRole('worker'), uploadPublic.single('file'), asyncH(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'File missing' });
  const p = await WorkerProfile.findOne({ user: req.user._id });
  if (p.portfolio.length >= 12) return res.status(400).json({ message: 'Max 12 portfolio images' });
  p.portfolio.push({ url: req.file.path, caption: (req.body.caption || '').slice(0, 100) });
  await p.save();
  res.status(201).json({ portfolio: p.portfolio });
}));

router.delete('/me/portfolio/:itemId', requireAuth, requireRole('worker'), asyncH(async (req, res) => {
  const p = await WorkerProfile.findOne({ user: req.user._id });
  p.portfolio = p.portfolio.filter((i) => String(i._id) !== req.params.itemId);
  await p.save();
  res.json({ portfolio: p.portfolio });
}));

// ---------- verification submission (document goes to PRIVATE storage) ----------
router.post('/me/verifications', requireAuth, requireRole('worker'), uploadPrivate.single('document'), asyncH(async (req, res) => {
  const checkType = req.body.checkType;
  if (!['identity', 'skills', 'background'].includes(checkType)) return res.status(400).json({ message: 'Invalid checkType' });
  if (req.body.consent !== 'true') return res.status(400).json({ message: 'Your consent is required to process this document' });
  if (!req.file) return res.status(400).json({ message: 'Document required' });
  const p = await WorkerProfile.findOne({ user: req.user._id });
  if (await VerificationRecord.findOne({ worker: p._id, checkType, status: 'pending' })) {
    fs.unlink(req.file.path, () => {});
    return res.status(409).json({ message: 'A request of this type is already under review' });
  }
  const rec = await VerificationRecord.create({
    worker: p._id, checkType, documentPath: req.file.path, documentName: req.file.originalname,
    consent: { given: true, at: new Date() }, submittedNote: (req.body.note || '').slice(0, 300),
  });
  p.verification[checkType].status = 'pending';
  await p.save();
  res.status(201).json({ id: rec._id, status: rec.status });
}));

// ---------- QR card ----------
router.get('/me/qr', requireAuth, requireRole('worker'), asyncH(async (req, res) => {
  const p = await WorkerProfile.findOne({ user: req.user._id }).populate('user', 'name');
  const url = `${process.env.CLIENT_URL}/w/${p.qrToken}`;
  const dataUrl = await QRCode.toDataURL(url, { width: 480, margin: 1, errorCorrectionLevel: 'M' });
  res.json({ url, dataUrl, profile: toPublicWorker(p), scans: p.qrScans });
}));

// If the card is lost/stolen, rotate token: old QR stops working immediately.
router.post('/me/qr/rotate', requireAuth, requireRole('worker'), asyncH(async (req, res) => {
  const p = await WorkerProfile.findOne({ user: req.user._id });
  p.qrToken = crypto.randomBytes(12).toString('hex');
  await p.save();
  res.json({ ok: true });
}));

// ---------- public profile by id ----------
router.get('/:id', asyncH(async (req, res) => {
  const p = await WorkerProfile.findOne({ _id: req.params.id, isPublished: true }).populate('user', 'name accountStatus');
  if (!p || p.user.accountStatus !== 'active') return res.status(404).json({ message: 'Worker not found' });
  const reviews = await Review.find({ worker: p._id, moderationStatus: 'visible' }).sort('-createdAt').limit(20).populate('customer', 'name');
  const [sub] = await Review.aggregate([
    { $match: { worker: p._id, moderationStatus: 'visible' } },
    { $group: { _id: null, punctuality: { $avg: '$punctuality' }, communication: { $avg: '$communication' }, quality: { $avg: '$quality' }, estimateAdherence: { $avg: '$estimateAdherence' } } },
  ]);
  res.json({
    worker: toPublicWorker(p, { subRatings: sub ? { punctuality: sub.punctuality, communication: sub.communication, quality: sub.quality, estimateAdherence: sub.estimateAdherence } : null }),
    reviews: reviews.map((r) => ({ id: r._id, rating: r.rating, feedback: r.feedback, customer: r.customer.name.split(' ')[0], createdAt: r.createdAt })),
  });
}));

export default router;
export { PRIV };
