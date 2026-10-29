import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import ReportForm from '../components/ReportForm.jsx';
import { Msg, StatusChip, fmtDateTime, inr } from '../components/ui.jsx';

const tone = { requested: 'pending', accepted: 'verified', in_progress: 'verified', completed: 'verified', rejected: 'rejected', cancelled: 'rejected' };

function ReviewForm({ bookingId, onDone }) {
  const [f, setF] = useState({ rating: 5, punctuality: 5, communication: 5, quality: 5, estimateAdherence: 5, feedback: '' });
  const [error, setError] = useState('');
  const sel = (k, l) => <div key={k}><label className="label">{l}</label><select className="input" value={f[k]} onChange={(e) => setF({ ...f, [k]: Number(e.target.value) })}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}</option>)}</select></div>;
  const submit = async (e) => { e.preventDefault(); try { await api.post('/reviews', { bookingId, ...f }); onDone(); } catch (er) { setError(errMsg(er)); } };
  return (
    <form onSubmit={submit} className="mt-3 space-y-3 rounded-lg border border-line p-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{sel('rating', 'Overall')}{sel('punctuality', 'Punctuality')}{sel('communication', 'Communication')}{sel('quality', 'Work quality')}{sel('estimateAdherence', 'Stuck to estimate')}</div>
      <div><label className="label">Comment</label><textarea className="input" rows="2" maxLength="1000" value={f.feedback} onChange={(e) => setF({ ...f, feedback: e.target.value })} /></div>
      <Msg error={error} /><button className="btn-stamp">Submit review</button>
    </form>
  );
}

function Card({ b, role, reload }) {
  const [msg, setMsg] = useState({});
  const [code, setCode] = useState('');
  const [rev, setRev] = useState({ amount: '', reason: '' });
  const [done, setDone] = useState({ amount: '', notes: '' });
  const [panel, setPanel] = useState('');
  const act = async (fn) => { try { await fn(); setMsg({}); setPanel(''); reload(); } catch (e) { setMsg({ error: errMsg(e) }); } };
  const status = (s, extra = {}) => act(() => api.patch(`/bookings/${b._id}/status`, { status: s, ...extra }));
  const other = role === 'customer' ? b.worker?.user : b.customer;
  const price = b.revision?.status === 'approved' ? b.revision.amount : b.estimate.amount;

  return (
    <div className="panel space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold">{b.service} <span className="font-normal text-mute">with {other?.name}</span></h3>
          <p className="text-sm text-mute">{fmtDateTime(b.scheduledAt)} · {b.address}</p>
          {other?.phone && <p className="text-sm">Phone: <a className="underline" href={`tel:${other.phone}`}>{other.phone}</a></p>}
        </div>
        <StatusChip status={tone[b.status]}>{b.status.replace('_', ' ')}</StatusChip>
      </div>
      {b.description && <p className="text-sm">{b.description}</p>}
      <p className="text-sm">Agreed estimate: <b>{inr(b.estimate.amount)}</b>{b.revision?.status !== 'none' && <> · Revised: <b>{inr(b.revision.amount)}</b> ({b.revision.status}) – {b.revision.reason}</>}{b.completion?.finalAmount != null && <> · Final: <b>{inr(b.completion.finalAmount)}</b></>}</p>

      {role === 'customer' && ['accepted', 'in_progress'].includes(b.status) && b.arrivalCode && (
        <p className="rounded-lg bg-marigold/20 px-3 py-2 text-sm">Arrival code: <b className="font-display text-xl tracking-widest">{b.arrivalCode}</b>. Tell it to the worker only when they reach you and you have checked their QR card.</p>
      )}
      <Msg {...msg} />
      <div className="flex flex-wrap gap-2">
        {role === 'worker' && b.status === 'requested' && <><button className="btn-stamp" onClick={() => status('accepted')}>Accept</button><button className="btn-danger" onClick={() => status('rejected')}>Reject</button></>}
        {role === 'worker' && b.status === 'accepted' && <div className="flex gap-2"><input className="input w-40" placeholder="Customer's code" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} /><button className="btn-stamp" onClick={() => status('in_progress', { arrivalCode: code })}>Start job</button></div>}
        {role === 'worker' && b.status === 'in_progress' && <><button className="btn-ghost" onClick={() => setPanel(panel === 'rev' ? '' : 'rev')}>Ask for extra amount</button><button className="btn-stamp" onClick={() => setPanel(panel === 'done' ? '' : 'done')}>Mark completed</button></>}
        {role === 'customer' && b.revision?.status === 'pending' && <><button className="btn-stamp" onClick={() => act(() => api.patch(`/bookings/${b._id}/revision`, { decision: 'approved' }))}>Approve {inr(b.revision.amount)}</button><button className="btn-danger" onClick={() => act(() => api.patch(`/bookings/${b._id}/revision`, { decision: 'declined' }))}>Decline</button></>}
        {['requested', 'accepted'].includes(b.status) && <button className="btn-ghost" onClick={() => status('cancelled')}>Cancel</button>}
        {role === 'customer' && b.status === 'completed' && !b.reviewed && <button className="btn-primary" onClick={() => setPanel(panel === 'review' ? '' : 'review')}>Write review</button>}
      </div>
      {panel === 'rev' && (
        <form className="grid gap-2 rounded-lg border border-line p-3 sm:grid-cols-[140px_1fr_auto]" onSubmit={(e) => { e.preventDefault(); act(() => api.post(`/bookings/${b._id}/revision`, { amount: Number(rev.amount), reason: rev.reason })); }}>
          <input className="input" type="number" min="0" required placeholder="New total ₹" value={rev.amount} onChange={(e) => setRev({ ...rev, amount: e.target.value })} />
          <input className="input" required minLength="5" placeholder="Why is extra work needed?" value={rev.reason} onChange={(e) => setRev({ ...rev, reason: e.target.value })} />
          <button className="btn-primary">Send to customer</button>
        </form>
      )}
      {panel === 'done' && (
        <form className="grid gap-2 rounded-lg border border-line p-3 sm:grid-cols-[140px_1fr_auto]" onSubmit={(e) => { e.preventDefault(); status('completed', { finalAmount: done.amount === '' ? undefined : Number(done.amount), notes: done.notes || undefined }); }}>
          <input className="input" type="number" min="0" placeholder={`Final ₹ (${price})`} value={done.amount} onChange={(e) => setDone({ ...done, amount: e.target.value })} />
          <input className="input" placeholder="Work notes (optional)" value={done.notes} onChange={(e) => setDone({ ...done, notes: e.target.value })} />
          <button className="btn-stamp">Complete</button>
        </form>
      )}
      {panel === 'review' && <ReviewForm bookingId={b._id} onDone={() => { setPanel(''); reload(); }} />}
      {role === 'customer' && ['in_progress', 'completed'].includes(b.status) && <ReportForm bookingId={b._id} />}
    </div>
  );
}

export default function Bookings() {
  const { user } = useAuth();
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const load = () => api.get('/bookings/me').then((r) => setList(r.data.bookings)).catch((e) => setError(errMsg(e)));
  useEffect(() => { load(); }, []);
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
      <h1 className="text-3xl font-extrabold">Bookings</h1>
      <Msg error={error} />
      {list === null && !error && <p className="text-mute">Loading…</p>}
      {list?.length === 0 && <div className="panel">No bookings yet. {user.role === 'customer' && <Link className="font-semibold underline" to="/workers">Find a worker</Link>}</div>}
      {list?.map((b) => <Card key={b._id} b={b} role={user.role} reload={load} />)}
    </div>
  );
}
