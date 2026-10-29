import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    worker: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkerProfile', required: true, index: true },
    service: { type: String, required: true },
    description: { type: String, default: '' },
    scheduledAt: { type: Date, required: true },
    address: { type: String, required: true },
    city: { type: String, default: '' },
    estimate: { amount: { type: Number, required: true }, note: String },
    // Extra work must be approved by customer
    revision: {
      amount: Number,
      reason: String,
      status: { type: String, enum: ['none', 'pending', 'approved', 'declined'], default: 'none' },
    },
    status: {
      type: String,
      enum: ['requested', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled'],
      default: 'requested',
      index: true,
    },
    arrivalCode: { type: String }, // customer shares on arrival; worker enters to start job
    completion: { completedAt: Date, finalAmount: Number, notes: String },
    reviewed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Booking', bookingSchema);
