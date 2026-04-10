const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../services/authService');
const { db } = require('../db');
const { users } = require('../db/schema');
const { eq } = require('drizzle-orm');

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: true, message: 'Missing or invalid authorization header' });
    }
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Optional: Verify user still exists in DB
      const [user] = await db.select().from(users).where(eq(users.id, decoded.id)).limit(1);
      
      if (!user) {
        return res.status(401).json({ error: true, message: 'User not found' });
      }

      req.user = user;
      next();
    } catch (err) {
      console.error('[requireAuth] JWT Verify Error:', err.message);
      return res.status(401).json({ error: true, message: 'Invalid or expired token' });
    }
  } catch (err) {
    console.error('[requireAuth] General Error:', err.message);
    return res.status(401).json({ error: true, message: 'Authentication failed' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ error: true, message: 'Admin access required' });
}

module.exports = { requireAuth, requireAdmin };
