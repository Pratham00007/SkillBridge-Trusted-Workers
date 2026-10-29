import { useEffect, useState } from 'react';
import api, { errMsg, apiBase } from '../api.js';
import { Msg, StatusChip, fmtDate } from '../components/ui.jsx';

function Verifications() {
  const [list, setList] = useState([]);
  const [msg, setMsg] = useState({});
  const [notes, setNotes] = useState({});
  const load = () => api.get('/admin/verifications').then((r) => setList(r.data.verifications)).catch((e) => setMsg({ error: errMsg(e) }));
  useEffect(() => { load(); }, []);
  const decide = async (id, decision) => { try { await api.patch(`/admin/verifications/${id}`, { decision, note: notes[id] }); load(); } catch (e) { setMsg({ error: errMsg(e) }); } };
  return (
    <div className="space-y-3"><Msg {...msg} />
      {list.length === 0 && <div className="panel">No pending verification requests.</div>}
      {list.map((v) => (
        <div key={v._id} className="panel space-y-2">
          <div className="flex justify-between"><p className="font-bold">{v.worker?.user?.name} <span className="font-normal text-mute">· {v.worker?.category} · {v.worker?.city}</span></p><StatusChip status="pending">{v.checkType}</StatusChip></div>
          <p className="text-sm text-mute">Sent {fmtDate(v.createdAt)} · consent given {fmtDate(v.consent?.at)} · {v.documentName}{v.submittedNote && ` · "${v.submittedNote}"`}</p>
          <a className="btn-ghost" href={`${apiBase}/api/admin/verifications/${v._id}/document`} target="_blank" rel="noreferrer">Open document</a>
          <input className="input" placeholder="Note (shown for skills; e.g. 'ITI certificate seen')" value={notes[v._id] || ''} onChange={(e) => setNotes({ ...notes, [v._id]: e.target.value })} />
          <div className="flex gap-2"><button className="btn-stamp" onClick={() => decide(v._id, 'verified')}>Verify (valid 12 months)</button><button className="btn-danger" onClick={() => decide(v._id, 'rejected')}>Reject</button></div>
        </div>
      ))}
    </div>
  );
}

function Complaints() {
  const [list, setList] = useState([]);
  const [res, setRes] = useState({});
  const load = () => api.get('/admin/complaints').then((r) => setList(r.data.complaints));
  useEffect(() => { load(); }, []);
  const upd = async (id, status) => { await api.patch(`/admin/complaints/${id}`, { status, resolution: res[id] }); load(); };
  return (
    <div className="space-y-3">
      {list.length === 0 && <div className="panel">No open complaints.</div>}
      {list.map((c) => (
        <div key={c._id} className="panel space-y-2">
          <p className="font-bold">{c.category.replace('_', ' ')} <span className="font-normal text-mute">against {c.against?.user?.name} · by {c.reporter?.name} · {fmtDate(c.createdAt)}</span></p>
          <p>{c.description}</p>
          <input className="input" placeholder="Resolution note" value={res[c._id] || ''} onChange={(e) => setRes({ ...res, [c._id]: e.target.value })} />
          <div className="flex flex-wrap gap-2"><button className="btn-ghost" onClick={() => upd(c._id, 'under_review')}>Mark under review</button><button className="btn-stamp" onClick={() => upd(c._id, 'resolved')}>Resolve</button><button className="btn-ghost" onClick={() => upd(c._id, 'dismissed')}>Dismiss</button></div>
        </div>
      ))}
    </div>
  );
}

function Workers() {
  const [list, setList] = useState([]);
  const load = () => api.get('/admin/workers').then((r) => setList(r.data.workers));
  useEffect(() => { load(); }, []);
  const toggle = async (w) => { await api.patch(`/admin/users/${w.userId}/status`, { accountStatus: w.accountStatus === 'active' ? 'suspended' : 'active' }); load(); };
  return (
    <div className="panel overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-line"><th className="py-2">Worker</th><th>ID</th><th>Skills</th><th>Rating</th><th>Open complaints</th><th>Account</th></tr></thead>
      <tbody>{list.map((w) => <tr key={w.id} className="border-b border-line last:border-0"><td className="py-2"><b>{w.name}</b><br /><span className="text-mute">{w.category} · {w.city}</span></td><td>{w.verification.identity}</td><td>{w.verification.skills}</td><td>{w.stats.ratingAvg} ({w.stats.ratingCount})</td><td>{w.stats.complaintsOpen}</td><td><button className={w.accountStatus === 'active' ? 'btn-danger' : 'btn-stamp'} onClick={() => toggle(w)}>{w.accountStatus === 'active' ? 'Suspend' : 'Reinstate'}</button></td></tr>)}</tbody></table></div>
  );
}

export default function Admin() {
  const [tab, setTab] = useState('verifications');
  const [o, setO] = useState(null);
  useEffect(() => { api.get('/admin/overview').then((r) => setO(r.data)); }, [tab]);
  const tabs = [['verifications', 'Verification queue'], ['complaints', 'Complaints'], ['workers', 'Workers']];
  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-8">
      <h1 className="text-3xl font-extrabold">Admin</h1>
      {o && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[['Workers', o.workers], ['ID verified', o.verifiedWorkers], ['Pending checks', o.pendingVerifications], ['Open complaints', o.openComplaints]].map(([l, v]) => <div key={l} className="panel"><p className="text-3xl font-extrabold">{v}</p><p className="text-sm text-mute">{l}</p></div>)}</div>}
      <div className="flex gap-2" role="tablist">{tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-lg px-4 py-2 font-semibold ${tab === k ? 'bg-ink text-white' : 'border border-line bg-white'}`}>{l}</button>)}</div>
      {tab === 'verifications' && <Verifications />}{tab === 'complaints' && <Complaints />}{tab === 'workers' && <Workers />}
    </div>
  );
}
