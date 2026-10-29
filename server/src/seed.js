// DEMO DATA ONLY. Everything here is fictional; background-check "verified" is flagged isMock=true and shown as demo data.
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from './models/User.js';
import WorkerProfile from './models/WorkerProfile.js';
import Booking from './models/Booking.js';
import Review from './models/Review.js';
import { recomputeWorkerStats } from './utils/stats.js';

await mongoose.connect(process.env.MONGO_URI);
await Promise.all([User, WorkerProfile, Booking, Review].map((m) => m.deleteMany({})));
const hash = await bcrypt.hash('Password@123', 10);
const monthsAhead = (n) => { const d = new Date(); d.setMonth(d.getMonth() + n); return d; };

const admin = await User.create({ name: 'Admin', email: 'admin@skillbridge.test', passwordHash: hash, role: 'admin' });
const cust = await User.create({ name: 'Priya Verma', email: 'customer@skillbridge.test', phone: '9000000001', passwordHash: hash, role: 'customer' });

const workers = [
  { name: 'Rahul Sharma', cat: 'Electrician', skills: [[' ', 3], ['Wiring', 3], ['Fan repair', 2]], yrs: 3, city: 'Delhi', areas: ['110001', '110016', 'Saket'], rate: [300, 800], id: 'verified', sk: 'verified', bg: 'mock' },
  { name: 'Imran Khan', cat: 'Plumber', skills: [['Plumber', 6], ['Pipe fitting', 6], ['Bathroom fittings', 4]], yrs: 6, city: 'Delhi', areas: ['110001', 'Lajpat Nagar'], rate: [250, 700], id: 'verified', sk: 'none', bg: 'unavailable' },
  { name: 'Suresh Yadav', cat: 'Appliance Repair', skills: [['Washing machine repair', 8], ['AC repair', 5], ['Refrigerator repair', 6]], yrs: 8, city: 'Delhi', areas: ['110016', 'Hauz Khas'], rate: [400, 1200], id: 'verified', sk: 'verified', bg: 'unavailable' },
  { name: 'Anita Devi', cat: 'Cleaner', skills: [['Home cleaning', 4], ['Deep cleaning', 3]], yrs: 4, city: 'Gurugram', areas: ['122001'], rate: [500, 1500], id: 'pending', sk: 'none', bg: 'unavailable' },
  { name: 'Mohan Lal', cat: 'Carpenter', skills: [['Carpenter', 10], ['Furniture repair', 10]], yrs: 10, city: 'Noida', areas: ['201301'], rate: [350, 1000], id: 'none', sk: 'none', bg: 'unavailable' },
];

for (const w of workers) {
  const u = await User.create({ name: w.name, email: `${w.name.split(' ')[0].toLowerCase()}@skillbridge.test`, phone: '9100000000', passwordHash: hash, role: 'worker' });
  const p = await WorkerProfile.create({
    user: u._id, category: w.cat, headline: `${w.cat} · ${w.yrs} years experience`, bio: 'Demo profile. Fictional data for prototype.',
    skills: w.skills.map(([name, years]) => ({ name, years })), experienceYears: w.yrs, city: w.city, serviceAreas: w.areas,
    rate: { min: w.rate[0], max: w.rate[1], note: 'per visit' }, isPublished: true,
    credentials: w.sk === 'verified' ? [{ title: `${w.cat} certificate (demo)`, issuer: 'Demo ITI', year: 2019 }] : [],
  });
  const now = new Date();
  if (w.id === 'verified') p.verification.identity = { status: 'verified', verifiedAt: now, expiresAt: monthsAhead(12) };
  if (w.id === 'pending') p.verification.identity = { status: 'pending' };
  if (w.sk === 'verified') p.verification.skills = { status: 'verified', verifiedAt: now, expiresAt: monthsAhead(12), note: 'Demo assessment passed' };
  if (w.bg === 'mock') p.verification.background = { status: 'verified', verifiedAt: now, expiresAt: monthsAhead(12), isMock: true };
  await p.save();

  if (w.id === 'verified') {
    for (let i = 0; i < 3; i++) {
      const b = await Booking.create({ customer: cust._id, worker: p._id, service: w.cat, scheduledAt: new Date(Date.now() - 86400000 * (i + 2)), address: 'Demo address, Delhi', city: w.city, estimate: { amount: w.rate[0] }, status: 'completed', reviewed: true, completion: { completedAt: new Date(), finalAmount: w.rate[0] } });
      const r = 4 + (i % 2);
      await Review.create({ booking: b._id, customer: cust._id, worker: p._id, rating: r, punctuality: r, communication: 5, quality: r, estimateAdherence: 5, feedback: 'Demo review: kaam time par aur saaf hua.' });
    }
  }
  await recomputeWorkerStats(p._id);
}
console.log('Seeded. Logins (password Password@123): admin@skillbridge.test, customer@skillbridge.test, rahul@skillbridge.test');
await mongoose.disconnect();
