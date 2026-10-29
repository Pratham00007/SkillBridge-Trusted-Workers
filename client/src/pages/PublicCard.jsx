import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errMsg } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import TrustPanel from '../components/TrustPanel.jsx';
import ReportForm from '../components/ReportForm.jsx';
import { Avatar } from '../components/WorkerCard.jsx';
import { Msg, Stars, fmtDate, inr } from '../components/ui.jsx';

// Opened when someone scans the worker's QR card. Public, live data.
export default function PublicCard() {
  const { token } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api.get(`/public/w/${token}`).then((r) => setData(r.data)).catch((e) => setError(errMsg(e))); }, [token]);

  if (error) return <div className="mx-auto max-w-xl p-8"><div className="panel border-rust"><h1 className="text-xl font-bold text-rust">Card not valid</h1><p className="mt-1">{error}</p><p className="mt-2 text-sm text-mute">If someone showed you this card, do not let them in until you have checked with SkillBridge.</p></div></div>;
  if (!data) return <p className="p-8 text-mute">Checking card…</p>;
  const { worker: w, reviews, isPublished } = data;
  const idOk = w.trust.identity.status === 'verified';

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <div className={`rounded-xl border-2 p-4 ${idOk ? 'border-stamp bg-stamp/5' : 'border-marigold bg-marigold/10'}`}>
        <p className="font-semibold">{idOk ? '✓ Identity verified by SkillBridge' : 'Identity is NOT verified yet'}</p>
        <p className="text-sm text-mute">Live status as of {fmtDate(new Date())}. Match the face and name below with the person at your door.</p>
      </div>
      <div className="panel flex gap-4">
        <Avatar w={w} size="h-24 w-24" />
        <div><h1 className="text-2xl font-extrabold">{w.name}</h1><p className="text-mute">{w.category} · {w.city}</p><p className="mt-1 text-sm">{w.experienceYears} years experience (self-declared)</p><p className="text-sm">{inr(w.rate?.min)}–{inr(w.rate?.max)} {w.rate?.note}</p></div>
      </div>
      <TrustPanel trust={w.trust} />
      {w.skills.length > 0 && <div className="panel"><h2 className="font-bold">Skills</h2><ul className="mt-2 flex flex-wrap gap-2">{w.skills.map((s) => <li key={s._id || s.name} className="rounded-full border border-line px-3 py-1 text-sm">{s.name} · {s.years}y</li>)}</ul></div>}
      {reviews.length > 0 && <div className="panel"><h2 className="font-bold">Recent reviews</h2>{reviews.map((r, i) => <div key={i} className="border-b border-line py-2 last:border-0"><Stars value={r.rating} size="text-sm" /> <span className="text-sm text-mute">{r.customer}</span><p className="text-sm">{r.feedback}</p></div>)}</div>}
      <div className="flex flex-wrap items-start gap-3">
        {isPublished && <Link to={`/workers/${w.id}`} className="btn-stamp">View full profile and book</Link>}
        {user?.role === 'customer' ? <ReportForm workerId={w.id} /> : !user && <Link to="/login" className="btn-ghost">Log in to report a problem</Link>}
      </div>
      <p className="text-xs text-mute">Contact details are not shown here. Bookings keep phone numbers private until the worker accepts.</p>
    </div>
  );
}
