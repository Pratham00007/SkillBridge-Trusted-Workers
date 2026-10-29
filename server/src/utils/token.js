import jwt from 'jsonwebtoken';

const cookieOpts = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.COOKIE_SAMESITE || 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

export function setAuthCookie(res, user) {
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('sb_token', token, cookieOpts());
}

export function clearAuthCookie(res) {
  const { maxAge, ...opts } = cookieOpts();
  res.clearCookie('sb_token', opts);
}
