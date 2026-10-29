import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    worker: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkerProfile', required: true, index: true },
    checkType: { type: String, enum: ['identity', 'skills', 'background'], required: true },
    provider: { type: String, default: 'manual-admin-review' },
    status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending', index: true },
    // SENSITIVE: stored outside public folder; only admin endpoint can read
    documentPath: String,
    documentName: String,
    consent: { given: { type: Boolean, default: false }, at: Date },
    submittedNote: String,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewNote: String,
    checkedAt: Date,
    expiryDate: Date,
    isMock: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('VerificationRecord', schema);
