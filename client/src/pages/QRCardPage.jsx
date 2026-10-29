import { useEffect, useState } from 'react';
import api, { errMsg, img } from '../api.js';
import { Msg } from '../components/ui.jsx';

// Printable ID card. The card carries NO static "verified" claim: the QR opens a live page,
// so a printed card can never show an outdated or forged status.
export default function QRCardPage() {
  const [d, setD] = useState(null);
  const [msg, setMsg] = useState({});
  const load = () => api.get('/workers/me/qr').then((r) => setD(r.data)).catch((e) => setMsg({ error: errMsg(e) }));
  useEffect(() => { load(); }, []);
  if (!d) return <div className="p-8"><Msg {...msg} /></div>;
  const w = d.profile;

  const rotate = async () => {
    if (!confirm('Old card will stop working immediately. Continue?')) return;
    await api.post('/workers/me/qr/rotate'); setMsg({ ok: 'New QR created. Print the card again.' }); load();
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="no-print mb-6 space-y-2">
        <h1 className="text-3xl font-extrabold">Your QR card</h1>
        <p className="text-mute">Print this and keep it with you. Customers scan it to see your live ID, skills and review status.</p>
        <Msg {...msg} />
        {w.trust.identity.status !== 'verified' && <p className="rounded-lg bg-marigold/20 px-3 py-2 text-sm">Your identity is not verified yet, so the scan page will say so. Submit your ID from "My profile" to get the verified badge.</p>}
        <div className="flex gap-2"><button className="btn-primary" onClick={() => window.print()}>Print card</button><button className="btn-ghost" onClick={rotate}>Card lost? Reset QR</button></div>
      </div>

      <div className="mx-auto w-[340px] overflow-hidden rounded-2xl border-2 border-ink bg-white">
        <div className="flex items-center justify-between bg-ink px-4 py-2 text-white"><span className="font-display text-lg font-bold">SkillBridge</span><span className="text-sm">Worker ID</span></div>
        <div className="flex gap-3 p-4">
          {w.photoUrl ? <img src={img(w.photoUrl)} alt="" className="h-20 w-20 rounded-lg object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-ink text-3xl font-bold text-white">{w.name?.[0]}</div>}
          <div><p className="font-display text-xl font-bold leading-tight">{w.name}</p><p className="text-mute">{w.category}</p><p className="text-sm">{w.city}</p></div>
        </div>
        <div className="flex flex-col items-center border-t border-line p-4">
          <img src={d.dataUrl} alt="QR code to your SkillBridge profile" className="h-48 w-48" />
          <p className="mt-2 text-center text-sm font-semibold">Scan to check my live ID, skills and reviews</p>
          <p className="break-all text-center text-[10px] text-mute">{d.url}</p>
        </div>
        <p className="bg-marigold px-4 py-1.5 text-center text-xs font-semibold">If the scan page does not match this card, do not let the person in.</p>
      </div>
    </div>
  );
}
