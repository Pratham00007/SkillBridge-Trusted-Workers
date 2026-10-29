import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/auth/me').then((r) => setUser(r.data.user)).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => { const r = await api.post('/auth/login', { email, password }); setUser(r.data.user); return r.data.user; };
  const register = async (data) => { const r = await api.post('/auth/register', data); setUser(r.data.user); return r.data.user; };
  const logout = async () => { await api.post('/auth/logout'); setUser(null); };

  return <Ctx.Provider value={{ user, loading, login, register, logout }}>{children}</Ctx.Provider>;
}
