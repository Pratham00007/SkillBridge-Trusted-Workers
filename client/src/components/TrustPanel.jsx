import { StatusChip, Stars, fmtDate } from './ui.jsx';

const Row = ({ title, what, state }) => (
  <div className="flex items-start justify-between gap-3 border-b border-line py-3 last:border-0">
    <div>
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-mute">{what}{state.asOf ? ` · checked ${fmtDate(state.asOf)}` : ''}{state.note ? ` · ${state.note}` : ''}</p>
    </div>
    <StatusChip status={state.status}>{state.label}</StatusChip>
  </div>
);

// Explainable trust information: what is verified, how recent, and what is NOT verified.
export default function TrustPanel({ trust, subRatings }) {
  const m = trust.metrics;
  return (
    <section className="panel" aria-label="Trust information">
      <h2 className="text-xl font-bold">Trust information</h2>
      <div className="mt-2">
        <Row title="Identity" what="Government ID checked by SkillBridge admin" state={trust.identity} />
        <Row title="Skills" what="Documents or assessment reviewed" state={trust.skills} />
        <Row title="Background check" what="Consent-based, via a lawful provider" state={trust.background} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg bg-paper p-3"><p className="text-2xl font-bold">{m.ratingCount ? m.ratingAvg : '–'}</p><Stars value={m.ratingAvg} size="text-sm" /><p className="text-xs text-mute">{m.ratingCount} reviews</p></div>
        <div className="rounded-lg bg-paper p-3"><p className="text-2xl font-bold">{m.completedJobs}</p><p className="text-xs text-mute">jobs completed</p></div>
        <div className="rounded-lg bg-paper p-3"><p className="text-2xl font-bold">{m.experienceYears}</p><p className="text-xs text-mute">years (self-declared)</p></div>
      </div>
      {subRatings && (
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
          {[['punctuality', 'Punctuality'], ['communication', 'Communication'], ['quality', 'Work quality'], ['estimateAdherence', 'Stuck to estimate']].map(([k, l]) => (
            <div key={k} className="flex justify-between border-b border-line py-1"><dt className="text-mute">{l}</dt><dd className="font-semibold">{subRatings[k]?.toFixed(1)}</dd></div>
          ))}
        </dl>
      )}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="font-semibold text-stamp">What we can show</h3>
          <ul className="mt-1 list-disc pl-5 text-sm">{trust.evidence.length ? trust.evidence.map((e) => <li key={e}>{e}</li>) : <li>Nothing verified yet</li>}</ul>
        </div>
        <div>
          <h3 className="font-semibold text-rust">What is not verified</h3>
          <ul className="mt-1 list-disc pl-5 text-sm">{trust.notVerified.length ? trust.notVerified.map((e) => <li key={e}>{e}</li>) : <li>No gaps listed</li>}</ul>
        </div>
      </div>
      <p className="mt-4 text-xs text-mute">{trust.disclaimer}</p>
    </section>
  );
}
