import axios from 'axios';

const base = import.meta.env.VITE_API_URL || '';
const api = axios.create({ baseURL: `${base}/api`, withCredentials: true });

export const img = (u) => (!u ? '' : u.startsWith('http') ? u : `${base}${u}`);
export const apiBase = base;
export const errMsg = (e) => e?.response?.data?.errors?.join(', ') || e?.response?.data?.message || 'Something went wrong. Try again.';
export default api;
