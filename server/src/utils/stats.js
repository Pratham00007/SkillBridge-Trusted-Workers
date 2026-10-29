import Review from '../models/Review.js';
import Booking from '../models/Booking.js';
import Complaint from '../models/Complaint.js';
import WorkerProfile from '../models/WorkerProfile.js';

export async function recomputeWorkerStats(workerId) {
  const [agg] = await Review.aggregate([
    { $match: { worker: workerId, moderationStatus: 'visible' } },
    { $group: { _id: '$worker', avg: { $avg: '$rating' }, n: { $sum: 1 } } },
  ]);
  const completedJobs = await Booking.countDocuments({ worker: workerId, status: 'completed' });
  const complaintsOpen = await Complaint.countDocuments({ against: workerId, status: { $in: ['open', 'under_review'] } });
  const complaintsResolved = await Complaint.countDocuments({ against: workerId, status: 'resolved' });
  await WorkerProfile.findByIdAndUpdate(workerId, {
    'stats.ratingAvg': agg ? Math.round(agg.avg * 10) / 10 : 0,
    'stats.ratingCount': agg ? agg.n : 0,
    'stats.completedJobs': completedJobs,
    'stats.complaintsOpen': complaintsOpen,
    'stats.complaintsResolved': complaintsResolved,
  });
}
