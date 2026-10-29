import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { errMsg } from '../api.js';
import { Msg } from '../components/ui.jsx';

const home = (u) => (u.role === 'worker' ? '/worker/dashboard' : u.role === 'admin' ? '/admin' : '/workers');

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const submit = async (e) => { e.preventDefault(); try { nav(home(await login(f.email, f.password))); } catch (er) { setError(errMsg(er)); } };
  return (
    <form onSubmit={submit} className="panel mx-auto mt-12 max-w-md space-y-3">
      <h1 className="text-2xl font-bold">Log in</h1>
      <div><label className="label">Email</label><input type="email" required className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
      <div><label className="label">Password</label><input type="password" required className="input" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
      <Msg error={error} />
      <button className="btn-primary w-full">Log in</button>
      <p className="text-sm text-mute">New here? <Link className="font-semibold text-ink underline" to="/register">Create an account</Link></p>
    </form>
  );
}

export function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '', role: 'customer' });
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    try { const d = { ...f }; if (!d.phone) delete d.phone; nav(home(await register(d))); } catch (er) { setError(errMsg(er)); }
  };
  return (
    <form onSubmit={submit} className="panel mx-auto mt-12 max-w-md space-y-3">
      <h1 className="text-2xl font-bold">Create account</h1>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Account type">
        {[['customer', 'I need a worker'], ['worker', 'I am a worker']].map(([v, l]) => (
          <button type="button" key={v} role="radio" aria-checked={f.role === v} onClick={() => setF({ ...f, role: v })} className={`rounded-lg border px-3 py-2 font-semibold ${f.role === v ? 'border-ink bg-ink text-white' : 'border-line'}`}>{l}</button>
        ))}
      </div>
      <div><label className="label">Full name</label><input required minLength="2" className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div><label className="label">Email</label><input type="email" required className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
      <div><label className="label">Phone (optional)</label><input className="input" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
      <div><label className="label">Password (min 8 characters)</label><input type="password" required minLength="8" className="input" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
      <Msg error={error} />
      <button className="btn-primary w-full">Create account</button>
      <p className="text-sm text-mute">Already registered? <Link className="font-semibold text-ink underline" to="/login">Log in</Link></p>
    </form>
  );
}
