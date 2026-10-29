import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errMsg, img } from '../api.js';
import { Msg, StatusChip, fmtDate } from '../components/ui.jsx';
import TrustPanel from '../components/TrustPanel.jsx';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const parseSkills = (t) => t.split(',').map((s) => s.trim()).filter(Boolean).map((s) => { const [name, y] = s.split(':'); return { name: name.trim(), years: Number(y) || 0 }; });
const parseCreds = (t) => t.split('\n').map((s) => s.trim()).filter(Boolean).map((l) => { const [title, issuer, year] = l.split('|').map((x) => x?.trim()); return { title, issuer: issuer || undefined, year: Number(year) || undefined }; });

export default function WorkerDashboard() {
  const [data, setData] = useState(null);
  const [f, setF] = useState(null);
  const [msg, setMsg] = useState({});
  const [ver, setVer] = useState({ checkType: 'identity', note: '', consent: false, file: null });

  const load = () => api.get('/workers/me').then((r) => {
    const p = r.data.profile; setData(r.data);
    setF({ headline: p.headline || '', bio: p.bio || '', category: p.category || '', city: p.city || '', experienceYears: p.experienceYears || 0,
      skillsText: p.skills.map((s) => `${s.name}:${s.years}`).join(', '), areasText: p.serviceAreas.join(', '), min: p.rate.min, max: p.rate.max, note: p.rate.note,
      days: p.availability.days, startHour: p.availability.startHour, endHour: p.availability.endHour,
      credsText: p.credentials.map((c) => [c.title, c.issuer || '', c.year || ''].join(' | ')).join('\n'), isPublished: p.isPublished });
  }).catch((e) => setMsg({ error: errMsg(e) }));
  useEffect(() => { load(); }, []);
  if (!f) return <div className="p-8"><Msg {...msg} /></div>;

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async (e) => {
    e.preventDefault();
    try {
      await api.patch('/workers/me', {
        headline: f.headline, bio: f.bio, category: f.category, city: f.city, experienceYears: Number(f.experienceYears),
        skills: parseSkills(f.skillsText), serviceAreas: f.areasText.split(',').map((s) => s.trim()).filter(Boolean),
        rate: { min: Number(f.min), max: Number(f.max), note: f.note }, availability: { days: f.days, startHour: Number(f.startHour), endHour: Number(f.endHour) },
        credentials: parseCreds(f.credsText), isPublished: f.isPublished,
      });
      setMsg({ ok: 'Profile saved' }); load();
    } catch (er) { setMsg({ error: errMsg(er) }); }
  };
  const upload = async (url, file, extra = {}) => {
    const fd = new FormData(); fd.append(url.includes('verifications') ? 'document' : 'file', file); Object.entries(extra).forEach(([k, v]) => fd.append(k, v));
    try { await api.post(url, fd); setMsg({ ok: 'Uploaded' }); load(); } catch (er) { setMsg({ error: errMsg(er) }); }
  };
  const submitVer = (e) => {
    e.preventDefault();
    if (!ver.file) return setMsg({ error: 'Choose a document' });
    upload('/workers/me/verifications', ver.file, { checkType: ver.checkType, note: ver.note, consent: String(ver.consent) }).then(() => setVer({ ...ver, file: null, note: '' }));
  };
  const p = data.profile;

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <h1 className="text-3xl font-extrabold">My worker profile</h1>
        <Msg {...msg} />
        <form onSubmit={save} className="panel space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label">Trade / category</label><input className="input" placeholder="Electrician" value={f.category} onChange={set('category')} /></div>
            <div><label className="label">City</label><input className="input" value={f.city} onChange={set('city')} /></div>
            <div className="sm:col-span-2"><label className="label">Headline</label><input className="input" maxLength="120" value={f.headline} onChange={set('headline')} /></div>
            <div className="sm:col-span-2"><label className="label">About you</label><textarea rows="3" className="input" maxLength="1000" value={f.bio} onChange={set('bio')} /></div>
            <div><label className="label">Total experience (years)</label><input type="number" min="0" className="input" value={f.experienceYears} onChange={set('experienceYears')} /></div>
            <div><label className="label">Service areas (pincodes / localities)</label><input className="input" placeholder="110001, Saket" value={f.areasText} onChange={set('areasText')} /></div>
            <div className="sm:col-span-2"><label className="label">Skills as name:years, comma separated</label><input className="input" placeholder="Wiring:3, Fan repair:2" value={f.skillsText} onChange={set('skillsText')} /></div>
            <div><label className="label">Visit charge from (₹)</label><input type="number" min="0" className="input" value={f.min} onChange={set('min')} /></div>
            <div><label className="label">Visit charge up to (₹)</label><input type="number" min="0" className="input" value={f.max} onChange={set('max')} /></div>
          </div>
          <div><span className="label">Working days</span><div className="flex flex-wrap gap-2">{DAYS.map((d, i) => <label key={d} className={`cursor-pointer rounded-lg border px-3 py-1 ${f.days.includes(i) ? 'border-ink bg-ink text-white' : 'border-line'}`}><input type="checkbox" className="sr-only" checked={f.days.includes(i)} onChange={() => setF({ ...f, days: f.days.includes(i) ? f.days.filter((x) => x !== i) : [...f.days, i] })} />{d}</label>)}</div></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="label">From hour (0-23)</label><input type="number" min="0" max="23" className="input" value={f.startHour} onChange={set('startHour')} /></div><div><label className="label">Until hour (1-24)</label><input type="number" min="1" max="24" className="input" value={f.endHour} onChange={set('endHour')} /></div></div>
          <div><label className="label">Certificates, one per line: title | issuer | year</label><textarea rows="2" className="input" placeholder="ITI Electrician | NCVT | 2019" value={f.credsText} onChange={set('credsText')} />
            <p className="mt-1 text-xs text-mute">Shown as "self-declared" until an admin reviews your skills documents.</p></div>
          <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={f.isPublished} onChange={(e) => setF({ ...f, isPublished: e.target.checked })} /> Show my profile to customers</label>
          <button className="btn-primary">Save profile</button>
        </form>

        <section className="panel space-y-3">
          <h2 className="text-xl font-bold">Photo and past work</h2>
          <div className="flex flex-wrap items-center gap-4">
            {p.photoUrl && <img src={img(p.photoUrl)} alt="Your profile" className="h-20 w-20 rounded-xl object-cover" />}
            <div><label className="label">Profile photo (clear face photo)</label><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => e.target.files[0] && upload('/workers/me/photo', e.target.files[0])} /></div>
          </div>
          <div><label className="label">Add work sample</label><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => e.target.files[0] && upload('/workers/me/portfolio', e.target.files[0])} /></div>
          <div className="grid grid-cols-3 gap-2">{p.portfolio.map((i) => <div key={i._id} className="relative"><img src={img(i.url)} alt="" className="aspect-square w-full rounded-lg object-cover" /><button aria-label="Remove image" className="absolute right-1 top-1 rounded bg-white px-1.5 text-sm" onClick={async () => { await api.delete(`/workers/me/portfolio/${i._id}`); load(); }}>✕</button></div>)}</div>
        </section>

        <section className="panel space-y-3">
          <h2 className="text-xl font-bold">Get verified</h2>
          <p className="text-sm text-mute">Documents are stored privately and seen only by SkillBridge admins. They are deleted after the decision. Badges are given only after admin review.</p>
          <form onSubmit={submitVer} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label">What do you want verified?</label><select className="input" value={ver.checkType} onChange={(e) => setVer({ ...ver, checkType: e.target.value })}><option value="identity">Identity (Aadhaar / Voter ID / Passport…)</option><option value="skills">Skills (certificate / experience letter)</option><option value="background">Background check document</option></select></div>
              <div><label className="label">Document (image or PDF, max 5 MB)</label><input type="file" accept="image/*,application/pdf" onChange={(e) => setVer({ ...ver, file: e.target.files[0] })} /></div>
            </div>
            <input className="input" placeholder="Note for reviewer (optional)" value={ver.note} onChange={(e) => setVer({ ...ver, note: e.target.value })} />
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={ver.consent} onChange={(e) => setVer({ ...ver, consent: e.target.checked })} /> I consent to SkillBridge reviewing this document to verify me.</label>
            <button className="btn-primary">Submit for review</button>
          </form>
          {data.verifications.length > 0 && <ul className="divide-y divide-line">{data.verifications.map((v) => <li key={v._id} className="flex items-center justify-between py-2 text-sm"><span>{v.checkType} · sent {fmtDate(v.createdAt)}{v.reviewNote && ` · "${v.reviewNote}"`}</span><StatusChip status={v.status}>{v.status}</StatusChip></li>)}</ul>}
        </section>
      </div>
      <aside className="space-y-4 lg:sticky lg:top-20 lg:h-fit">
        <div className="panel"><h2 className="font-bold">Your QR card</h2><p className="text-sm text-mute">Scanned {p.qrScans} times.</p><Link to="/worker/card" className="btn-stamp mt-2 w-full">Open and print card</Link></div>
        <p className="text-sm font-semibold">How customers see your trust information:</p>
        <TrustPanel trust={p.trust} />
      </aside>
    </div>
  );
}
