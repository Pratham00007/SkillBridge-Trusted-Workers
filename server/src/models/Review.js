import mongoose from 'mongoose';

const score = { type: Number, min: 1, max: 5, required: true };

const reviewSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true }, // 1 review / booking
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    worker: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkerProfile', required: true, index: true },
    rating: score,
    punctuality: score,
    communication: score,
    quality: score,
    estimateAdherence: score,
    feedback: { type: String, default: '', maxlength: 1000 },
    moderationStatus: { type: String, enum: ['visible', 'flagged', 'removed'], default: 'visible' },
  },
  { timestamps: true }
);

export default mongoose.model('Review', reviewSchema);
