import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const link = ({ isActive }) => `px-3 py-1.5 rounded-lg font-semibold ${isActive ? 'bg-ink text-white' : 'hover:bg-line/60'}`;
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3">
        <Link to="/" className="mr-4 font-display text-xl font-extrabold">
          Skill<span className="text-stamp">Bridge</span>
        </Link>
        <nav className="flex flex-1 flex-wrap items-center gap-1">
          <NavLink to="/workers" className={link}>Find workers</NavLink>
          {user?.role === 'worker' && <><NavLink to="/worker/dashboard" className={link}>My profile</NavLink><NavLink to="/worker/card" className={link}>QR card</NavLink></>}
          {user && user.role !== 'admin' && <NavLink to="/bookings" className={link}>Bookings</NavLink>}
          {user?.role === 'admin' && <NavLink to="/admin" className={link}>Admin</NavLink>}
        </nav>
        {user ? (
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-mute sm:inline">{user.name}</span>
            <button className="btn-ghost" onClick={async () => { await logout(); nav('/'); }}>Log out</button>
          </div>
        ) : (
          <div className="flex gap-2"><Link to="/login" className="btn-ghost">Log in</Link><Link to="/register" className="btn-primary">Sign up</Link></div>
        )}
      </div>
    </header>
  );
}
