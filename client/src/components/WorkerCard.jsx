import { Link } from 'react-router-dom';
import { StatusChip, Stars, inr } from './ui.jsx';
import { img } from '../api.js';

export function Avatar({ w, size = 'h-16 w-16' }) {
  return w.photoUrl ? (
    <img src={img(w.photoUrl)} alt="" className={`${size} rounded-xl object-cover`} />
  ) : (
    <div className={`${size} flex items-center justify-center rounded-xl bg-ink font-display text-2xl font-bold text-white`}>{w.name?.[0]}</div>
  );
}

export default function WorkerCard({ w }) {
  const t = w.trust;
  return (
    <Link to={`/workers/${w.id}`} className="panel flex gap-4 transition-shadow hover:shadow-md">
      <Avatar w={w} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold leading-tight">{w.name}</h3>
            <p className="text-sm text-mute">{w.category} · {w.city}</p>
          </div>
          {w.match && (
            <div className="text-right" title={Object.entries(w.match.breakdown).map(([k, v]) => `${k}: ${v}%`).join('  ')}>
              <p className="text-xl font-extrabold text-stamp">{w.match.score}%</p>
              <p className="text-xs text-mute">job match</p>
            </div>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusChip status={t.identity.status}>ID {t.identity.label.toLowerCase()}</StatusChip>
          <StatusChip status={t.skills.status}>Skills {t.skills.label.toLowerCase()}</StatusChip>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {t.metrics.ratingCount > 0 ? <span><Stars value={t.metrics.ratingAvg} size="text-sm" /> {t.metrics.ratingAvg} ({t.metrics.ratingCount})</span> : <span className="text-mute">No reviews yet</span>}
          <span>{t.metrics.completedJobs} jobs</span>
          <span className="font-semibold">{inr(w.rate?.min)}–{inr(w.rate?.max)} <span className="font-normal text-mute">{w.rate?.note}</span></span>
        </div>
      </div>
    </Link>
  );
}
