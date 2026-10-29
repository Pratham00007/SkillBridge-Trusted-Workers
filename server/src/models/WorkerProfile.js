import mongoose from 'mongoose';
import crypto from 'crypto';

const statusEnum = ['none', 'pending', 'verified', 'rejected'];

const workerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    headline: { type: String, default: '' },
    bio: { type: String, default: '' },
    photoUrl: { type: String, default: '' },
    category: { type: String, default: '' }, // e.g. Electrician
    skills: [{ name: String, years: { type: Number, default: 0 } }],
    experienceYears: { type: Number, default: 0 },
    city: { type: String, default: '', index: true },
    serviceAreas: [String], // pincodes / localities
    rate: { min: { type: Number, default: 0 }, max: { type: Number, default: 0 }, note: { type: String, default: 'per visit' } },
    availability: {
      days: { type: [Number], default: [1, 2, 3, 4, 5, 6] }, // 0=Sun
      startHour: { type: Number, default: 9 },
      endHour: { type: Number, default: 19 },
    },
    portfolio: [{ url: String, caption: String }],
    credentials: [{ title: String, issuer: String, year: Number }],
    // Platform-controlled; workers can NEVER set these directly.
    verification: {
      identity: { status: { type: String, enum: statusEnum, default: 'none' }, verifiedAt: Date, expiresAt: Date },
      skills: { status: { type: String, enum: statusEnum, default: 'none' }, verifiedAt: Date, expiresAt: Date, note: String },
      background: {
        status: { type: String, enum: [...statusEnum, 'unavailable'], default: 'unavailable' },
        verifiedAt: Date,
        expiresAt: Date,
        isMock: { type: Boolean, default: false },
      },
    },
    stats: {
      ratingAvg: { type: Number, default: 0 },
      ratingCount: { type: Number, default: 0 },
      completedJobs: { type: Number, default: 0 },
      complaintsResolved: { type: Number, default: 0 },
      complaintsOpen: { type: Number, default: 0 },
    },
    qrToken: { type: String, unique: true, index: true, default: () => crypto.randomBytes(12).toString('hex') },
    qrScans: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('WorkerProfile', workerSchema);
