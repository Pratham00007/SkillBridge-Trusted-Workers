// Explainable trust profile: every badge says WHAT is verified, WHEN, and what is NOT verified.

const now = () => new Date();
const expired = (d) => d && new Date(d) < now();

function state(v) {
  if (!v || v.status === 'none') return { status: 'not_submitted', label: 'Not submitted' };
  if (v.status === 'pending') return { status: 'pending', label: 'Under review' };
  if (v.status === 'rejected') return { status: 'rejected', label: 'Not verified' };
  if (v.status === 'verified' && expired(v.expiresAt)) return { status: 'expired', label: 'Verification expired', asOf: v.verifiedAt };
  if (v.status === 'verified') return { status: 'verified', label: 'Verified', asOf: v.verifiedAt };
  if (v.status === 'unavailable') return { status: 'unavailable', label: 'Not available' };
  return { status: 'not_submitted', label: 'Not submitted' };
}

export function buildTrust(profile) {
  const v = profile.verification || {};
  const identity = state(v.identity);
  const skills = { ...state(v.skills), note: v.skills?.note };
  const background = { ...state(v.background), isMock: !!v.background?.isMock };
  if (background.status === 'verified') background.label = background.isMock ? 'Demo data (not a real check)' : 'Check completed';

  const s = profile.stats || {};
  const evidence = [];
  const notVerified = [];

  if (identity.status === 'verified') evidence.push('Government ID reviewed by SkillBridge admin' + (identity.asOf ? ` on ${new Date(identity.asOf).toLocaleDateString('en-IN')}` : ''));
  else notVerified.push('Identity has not been verified');

  if (skills.status === 'verified') evidence.push('Skills reviewed against documents / assessment' + (skills.note ? `: ${skills.note}` : ''));
  else notVerified.push('Skills are self-declared (not verified by SkillBridge)');

  if (background.status === 'verified' && !background.isMock) evidence.push('Consent-based background check completed through a lawful provider');
  else if (background.status === 'pending') notVerified.push('Background check is pending');
  else notVerified.push('No background check on record');

  if (s.completedJobs > 0) evidence.push(`${s.completedJobs} job(s) completed on SkillBridge`);
  if (s.ratingCount > 0) evidence.push(`${s.ratingCount} review(s) from verified completed bookings`);
  else notVerified.push('No reviews from completed bookings yet');
  if (s.complaintsOpen > 0) notVerified.push(`${s.complaintsOpen} complaint(s) currently under review`);

  return {
    identity,
    skills,
    background,
    metrics: {
      ratingAvg: s.ratingAvg || 0,
      ratingCount: s.ratingCount || 0,
      completedJobs: s.completedJobs || 0,
      complaintsOpen: s.complaintsOpen || 0,
      complaintsResolved: s.complaintsResolved || 0,
      experienceYears: profile.experienceYears || 0,
    },
    evidence,
    notVerified,
    disclaimer:
      'Identity verification does not mean the worker is an expert at every job, and a background check is not a guarantee of future behaviour. Always review the details above.',
    generatedAt: now(),
  };
}

export function toPublicWorker(profile, extra = {}) {
  const p = profile.toObject ? profile.toObject() : profile;
  const u = p.user && p.user.name ? p.user : null;
  const skillsVerified = p.verification?.skills?.status === 'verified' && !expired(p.verification.skills.expiresAt);
  return {
    id: p._id,
    name: u?.name,
    photoUrl: p.photoUrl,
    headline: p.headline,
    bio: p.bio,
    category: p.category,
    skills: p.skills,
    experienceYears: p.experienceYears,
    city: p.city,
    serviceAreas: p.serviceAreas,
    rate: p.rate,
    availability: p.availability,
    portfolio: p.portfolio,
    // credentials are labelled so customers know the status
    credentials: (p.credentials || []).map((c) => ({ ...c, status: skillsVerified ? 'reviewed' : 'self-declared' })),
    trust: buildTrust(p),
    ...extra,
  };
}
