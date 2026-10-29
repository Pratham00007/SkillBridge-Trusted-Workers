import { useState } from 'react';
import api, { errMsg } from '../api.js';
import { Msg } from './ui.jsx';

export default function ReportForm({ bookingId, workerId, onDone }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(bookingId ? 'poor_quality' : 'fake_profile');
  const [description, setDescription] = useState('');
  const [msg, setMsg] = useState({});

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/complaints', { bookingId, workerId, category, description });
      setMsg({ ok: 'Report sent. Our team will review it.' }); setOpen(false); onDone?.();
    } catch (er) { setMsg({ error: errMsg(er) }); }
  };

  return (
    <div>
      <button className="btn-danger" onClick={() => setOpen(!open)}>Report a problem</button>
      <Msg {...msg} />
      {open && (
        <form onSubmit={submit} className="mt-3 space-y-3 rounded-lg border border-line p-3">
          <div><label className="label">What happened?</label>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="poor_quality">Poor quality work</option><option value="extra_charges">Extra charges</option><option value="no_show">Did not show up</option>
              <option value="misconduct">Misconduct</option><option value="safety">Safety concern</option><option value="fake_profile">Fake or mismatched profile</option><option value="other">Other</option>
            </select></div>
          <div><label className="label">Details (min 10 characters)</label><textarea className="input" rows="3" required minLength="10" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <button className="btn-primary">Send report</button>
        </form>
      )}
    </div>
  );
}
