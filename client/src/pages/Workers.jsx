import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { errMsg } from '../api.js';
import WorkerCard from '../components/WorkerCard.jsx';
import { Msg } from '../components/ui.jsx';

export default function Workers() {
  const [sp, setSp] = useSearchParams();
  const [form, setForm] = useState({ service: sp.get('service') || '', city: sp.get('city') || '', pincode: sp.get('pincode') || '', date: sp.get('date') || '', verifiedOnly: sp.get('verifiedOnly') === 'true', minRating: sp.get('minRating') || '' });
  const [workers, setWorkers] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setWorkers(null);
    api.get('/workers', { params: Object.fromEntries(sp) }).then((r) => setWorkers(r.data.workers)).catch((e) => setError(errMsg(e)));
  }, [sp]);

  const apply = (e) => {
    e.preventDefault();
    setSp(Object.fromEntries(Object.entries(form).filter(([, v]) => v !== '' && v !== false)));
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[280px_1fr]">
      <form onSubmit={apply} className="panel h-fit space-y-3">
        <h2 className="text-lg font-bold">Filters</h2>
        <div><label className="label">Service</label><input className="input" value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} placeholder="Electrician, AC repair…" /></div>
        <div><label className="label">City</label><input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
        <div><label className="label">Pincode</label><input className="input" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} /></div>
        <div><label className="label">Date and time</label><input type="datetime-local" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
        <div><label className="label">Minimum rating</label><select className="input" value={form.minRating} onChange={(e) => setForm({ ...form, minRating: e.target.value })}><option value="">Any</option><option value="4">4 and above</option><option value="4.5">4.5 and above</option></select></div>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.verifiedOnly} onChange={(e) => setForm({ ...form, verifiedOnly: e.target.checked })} /> ID-verified only</label>
        <button className="btn-primary w-full">Apply</button>
      </form>
      <div className="space-y-3">
        <Msg error={error} />
        <p className="text-sm text-mute">Sorted by job match: skill fit, location, availability, experience, rating and verification. Hover the match % to see the breakdown.</p>
        {workers === null && !error && <p className="text-mute">Searching…</p>}
        {workers?.length === 0 && <div className="panel">No workers match these filters. Try removing the pincode or date.</div>}
        {workers?.map((w) => <WorkerCard key={w.id} w={w} />)}
      </div>
    </div>
  );
}
