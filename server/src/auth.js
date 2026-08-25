import jwt from 'jsonwebtoken';
export function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'Login is required.' });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET || 'development_secret'); next(); }
  catch { res.status(401).json({ message: 'Your session is invalid or expired.' }); }
}
