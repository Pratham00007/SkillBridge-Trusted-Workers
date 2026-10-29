import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.sb_token;
    if (!token) return res.status(401).json({ message: 'Login required' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select('-passwordHash');
    if (!user || user.accountStatus !== 'active') {
      return res.status(401).json({ message: 'Account not available' });
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Session expired, please login again' });
  }
}

export const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ message: 'Not allowed for your role' });
