const jwt = require('jsonwebtoken');

function signToken(payload) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is required');
  return jwt.sign(payload, secret, { expiresIn: '7d' });
}

function verifyToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is required');
  return jwt.verify(token, secret);
}

function authMiddleware() {
  return (req, res, next) => {
    const header = req.header('authorization') || '';
    const m = header.match(/^Bearer\s+(.+)$/i);
    if (!m) return res.status(401).json({ error: { message: 'Unauthorized' } });
    try {
      req.user = verifyToken(m[1]);
      next();
    } catch {
      return res.status(401).json({ error: { message: 'Unauthorized' } });
    }
  };
}

module.exports = { signToken, authMiddleware };
