import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    against: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkerProfile', required: true, index: true },
    category: { type: String, enum: ['poor_quality', 'extra_charges', 'no_show', 'misconduct', 'safety', 'fake_profile', 'other'], required: true },
    description: { type: String, required: true, maxlength: 2000 },
    status: { type: String, enum: ['open', 'under_review', 'resolved', 'dismissed'], default: 'open', index: true },
    resolution: String,
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('Complaint', schema);
