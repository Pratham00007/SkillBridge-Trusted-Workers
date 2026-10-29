import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="p-8 text-mute">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export function Stars({ value = 0, size = 'text-base' }) {
  const full = Math.round(value);
  return (
    <span className={`${size} text-marigold`} aria-label={`${value} out of 5`}>
      {'★'.repeat(full)}<span className="text-line">{'★'.repeat(5 - full)}</span>
    </span>
  );
}

const chip = {
  verified: 'bg-stamp/10 text-stamp border-stamp/40',
  pending: 'bg-marigold/20 text-[#7a5600] border-marigold',
  expired: 'bg-rust/10 text-rust border-rust/40',
  rejected: 'bg-rust/10 text-rust border-rust/40',
  not_submitted: 'bg-paper text-mute border-line',
  unavailable: 'bg-paper text-mute border-line',
};
export function StatusChip({ status, children }) {
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-sm font-semibold ${chip[status] || chip.not_submitted}`}>{status === 'verified' && '✓ '}{children}</span>;
}

export function Msg({ error, ok }) {
  if (!error && !ok) return null;
  return <p role="alert" className={`rounded-lg px-3 py-2 text-sm ${error ? 'bg-rust/10 text-rust' : 'bg-stamp/10 text-stamp'}`}>{error || ok}</p>;
}

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');
export const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
