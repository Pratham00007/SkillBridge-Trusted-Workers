import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errMsg, img } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import TrustPanel from '../components/TrustPanel.jsx';
import ReportForm from '../components/ReportForm.jsx';
import { Avatar } from '../components/WorkerCard.jsx';
import { Msg, Stars, fmtDate, inr } from '../components/ui.jsx';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function BookingForm({ w }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ service: w.category, description: '', scheduledAt: '', address: '', estimateAmount: w.rate?.min || 0 });
  const [error, setError] = useState('');

  if (!user) return <div className="panel"><Link className="btn-primary" to="/login">Log in to book</Link></div>;
  if (user.role !== 'customer') return <div className="panel text-mute">Only customer accounts can book.</div>;

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/bookings', { workerId: w.id, ...f, estimateAmount: Number(f.estimateAmount), city: w.city });
      nav('/bookings');
    } catch (er) { setError(errMsg(er)); }
  };
  return (
    <form onSubmit={submit} className="panel space-y-3">
      <h2 className="text-xl font-bold">Request a booking</h2>
      <div><label className="label">Service</label><input className="input" required value={f.service} onChange={(e) => setF({ ...f, service: e.target.value })} /></div>
      <div><label className="label">What needs to be done?</label><textarea className="input" rows="3" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
      <div><label className="label">Date and time</label><input type="datetime-local" required className="input" value={f.scheduledAt} onChange={(e) => setF({ ...f, scheduledAt: e.target.value })} /></div>
      <div><label className="label">Address</label><textarea className="input" rows="2" required minLength="5" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
      <div><label className="label">Estimate you accept (₹)</label><input type="number" min="0" className="input" value={f.estimateAmount} onChange={(e) => setF({ ...f, estimateAmount: e.target.value })} />
        <p className="mt-1 text-xs text-mute">Worker's range is {inr(w.rate?.min)}–{inr(w.rate?.max)} {w.rate?.note}. Extra work needs your approval later.</p></div>
      <Msg error={error} />
      <button className="btn-stamp w-full">Send request</button>
    </form>
  );
}

export default function WorkerDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api.get(`/workers/${id}`).then((r) => setData(r.data)).catch((e) => setError(errMsg(e))); }, [id]);
  if (error) return <div className="mx-auto max-w-3xl p-8"><Msg error={error} /></div>;
  if (!data) return <p className="p-8 text-mute">Loading…</p>;
  const { worker: w, reviews } = data;

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <div className="panel flex gap-4">
          <Avatar w={w} size="h-24 w-24" />
          <div>
            <h1 className="text-3xl font-extrabold">{w.name}</h1>
            <p className="text-mute">{w.headline || w.category} · {w.city}</p>
            <p className="mt-2 font-semibold">{inr(w.rate?.min)}–{inr(w.rate?.max)} <span className="font-normal text-mute">{w.rate?.note}</span></p>
          </div>
        </div>
        <TrustPanel trust={w.trust} subRatings={w.subRatings} />
        <section className="panel">
          <h2 className="text-xl font-bold">About and skills</h2>
          {w.bio && <p className="mt-2">{w.bio}</p>}
          <ul className="mt-3 flex flex-wrap gap-2">{w.skills.map((s) => <li key={s._id || s.name} className="rounded-full border border-line px-3 py-1 text-sm">{s.name} · {s.years}y</li>)}</ul>
          <p className="mt-3 text-sm text-mute">Works {w.availability.days.map((d) => DAYS[d]).join(', ')}, {w.availability.startHour}:00–{w.availability.endHour}:00. Areas: {w.serviceAreas.join(', ') || 'not listed'}.</p>
          {w.credentials.length > 0 && <div className="mt-3"><h3 className="font-semibold">Credentials</h3><ul className="text-sm">{w.credentials.map((c) => <li key={c._id}>{c.title} {c.issuer && `· ${c.issuer}`} {c.year && `· ${c.year}`} <span className="text-mute">({c.status})</span></li>)}</ul></div>}
        </section>
        {w.portfolio.length > 0 && <section className="panel"><h2 className="text-xl font-bold">Past work</h2><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{w.portfolio.map((p) => <figure key={p._id}><img src={img(p.url)} alt={p.caption || 'Work sample'} className="aspect-square w-full rounded-lg object-cover" />{p.caption && <figcaption className="text-xs text-mute">{p.caption}</figcaption>}</figure>)}</div></section>}
        <section className="panel">
          <h2 className="text-xl font-bold">Reviews from completed jobs</h2>
          {reviews.length === 0 && <p className="mt-2 text-mute">No reviews yet.</p>}
          {reviews.map((r) => <div key={r.id} className="border-b border-line py-3 last:border-0"><Stars value={r.rating} /> <span className="text-sm text-mute">{r.customer} · {fmtDate(r.createdAt)}</span><p>{r.feedback}</p></div>)}
        </section>
      </div>
      <aside className="space-y-4 lg:sticky lg:top-20 lg:h-fit">
        <BookingForm w={w} />
        {user?.role === 'customer' && <ReportForm workerId={w.id} />}
      </aside>
    </div>
  );
}
