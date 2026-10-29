// Simple, explainable weighted scoring (no AI needed for MVP).
export const WEIGHTS = { skill: 0.35, location: 0.2, availability: 0.1, experience: 0.15, rating: 0.1, verification: 0.1 };

const norm = (s = '') => s.toLowerCase().trim();

export function scoreWorker(p, { service, city, pincode, date }) {
  const b = {};
  const q = norm(service);

  if (!q) b.skill = 0.5;
  else {
    const hay = [p.category, p.headline, ...(p.skills || []).map((s) => s.name)].map(norm);
    const exactSkill = (p.skills || []).find((s) => norm(s.name) === q || norm(s.name).includes(q) || q.includes(norm(s.name)));
    if (norm(p.category) === q) b.skill = 1;
    else if (exactSkill) b.skill = 0.7 + Math.min(exactSkill.years / 10, 1) * 0.3;
    else b.skill = hay.some((h) => h && (h.includes(q) || q.includes(h))) ? 0.5 : 0;
  }

  b.location = 0.3;
  if (city && norm(p.city) === norm(city)) b.location = 0.8;
  else if (city) b.location = 0;
  if (pincode && (p.serviceAreas || []).map(norm).includes(norm(pincode))) b.location = 1;

  b.availability = 0.5;
  if (date) {
    const d = new Date(date);
    if (!isNaN(d)) {
      const dayOk = (p.availability?.days || []).includes(d.getDay());
      const hr = d.getHours();
      const hourOk = hr === 0 || (hr >= (p.availability?.startHour ?? 9) && hr < (p.availability?.endHour ?? 19));
      b.availability = dayOk && hourOk ? 1 : 0;
    }
  }

  b.experience = Math.min((p.experienceYears || 0) / 10, 1);

  // Bayesian average so 1 five-star review doesn't beat 40 good ones
  const C = 3.5, m = 5, n = p.stats?.ratingCount || 0, avg = p.stats?.ratingAvg || 0;
  b.rating = ((C * m + avg * n) / (m + n)) / 5;

  const v = p.verification || {};
  b.verification = ((v.identity?.status === 'verified' ? 0.6 : 0) + (v.skills?.status === 'verified' ? 0.4 : 0));

  const score = Object.entries(WEIGHTS).reduce((sum, [k, w]) => sum + (b[k] || 0) * w, 0);
  return { score: Math.round(score * 100), breakdown: Object.fromEntries(Object.entries(b).map(([k, v]) => [k, Math.round(v * 100)])) };
}
