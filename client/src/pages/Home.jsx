import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SERVICES = ['Electrician', 'Plumber', 'Appliance Repair', 'Carpenter', 'Cleaner'];

// Decorative sample QR (not scannable): clearly labelled as a sample.
function FakeQR() {
  const cells = [];
  for (let i = 0; i < 169; i++) cells.push(((i * 7 + (i % 13) * 3) % 5) < 2);
  return (
    <svg viewBox="0 0 13 13" className="h-28 w-28" aria-hidden="true">
      {cells.map((on, i) => on && <rect key={i} x={i % 13} y={Math.floor(i / 13)} width="1" height="1" fill="#12203A" />)}
      {[[0, 0], [10, 0], [0, 10]].map(([x, y]) => <g key={x + '' + y}><rect x={x} y={y} width="3" height="3" fill="#12203A" /><rect x={x + 0.6} y={y + 0.6} width="1.8" height="1.8" fill="#fff" /><rect x={x + 1} y={y + 1} width="1" height="1" fill="#12203A" /></g>)}
    </svg>
  );
}

export default function Home() {
  const nav = useNavigate();
  const [f, setF] = useState({ service: '', city: '', date: '' });
  const go = (e) => { e.preventDefault(); nav('/workers?' + new URLSearchParams(Object.fromEntries(Object.entries(f).filter(([, v]) => v)))); };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <h1 className="text-4xl font-extrabold leading-[1.05] sm:text-5xl">Check your electrician before they reach your door.</h1>
          <p className="mt-4 max-w-xl text-lg text-mute">SkillBridge shows who has been ID-checked, what skills were actually reviewed, and what reviews come from real completed jobs. Anything not verified is said plainly.</p>
          <form onSubmit={go} className="mt-6 grid gap-3 rounded-xl border border-line bg-white p-4 sm:grid-cols-[1.3fr_1fr_1fr_auto]">
            <div><label className="label" htmlFor="svc">Service needed</label><input id="svc" list="svcs" className="input" placeholder="e.g. Electrician" value={f.service} onChange={(e) => setF({ ...f, service: e.target.value })} /><datalist id="svcs">{SERVICES.map((s) => <option key={s} value={s} />)}</datalist></div>
            <div><label className="label" htmlFor="city">City</label><input id="city" className="input" placeholder="Delhi" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></div>
            <div><label className="label" htmlFor="dt">When</label><input id="dt" type="datetime-local" className="input" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
            <button className="btn-stamp self-end">Find workers</button>
          </form>
        </div>

        <div className="mx-auto w-full max-w-sm" aria-label="Sample worker QR card">
          <div className="rotate-[-2deg] rounded-2xl border-2 border-ink bg-white shadow-lg">
            <div className="flex items-center justify-between rounded-t-xl bg-ink px-4 py-2 text-white"><span className="font-display font-bold">SkillBridge</span><span className="text-sm">Worker ID</span></div>
            <div className="flex items-center gap-4 p-4">
              <FakeQR />
              <div><p className="font-display text-xl font-bold">Rahul Sharma</p><p className="text-mute">Electrician</p><p className="mt-2 text-xs text-mute">Scan to see live ID, skills and review status.</p></div>
            </div>
            <p className="rounded-b-xl bg-marigold px-4 py-1.5 text-center text-sm font-semibold">Sample card · not a real worker</p>
          </div>
          <p className="mt-4 text-center text-sm text-mute">Every registered worker gets a card like this. The QR opens a live page, so the card cannot show an old or fake status.</p>
        </div>
      </div>

      <div className="mt-16 grid gap-4 md:grid-cols-3">
        {[['ID and skills are separate', 'An ID-verified worker is not automatically an expert. We show each check on its own, with the date.'],
          ['Reviews only from real jobs', 'A review can be written only by the customer of a completed booking. One review per booking.'],
          ['Price changes need your OK', 'Extra work means a revised estimate. The job cannot be completed until you approve it.']].map(([t, d]) => (
          <div key={t} className="panel"><h2 className="text-lg font-bold">{t}</h2><p className="mt-1 text-mute">{d}</p></div>
        ))}
      </div>
    </div>
  );
}
