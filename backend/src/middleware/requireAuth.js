const PocketBase = require('pocketbase/cjs');

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: true, message: 'Missing or invalid authorization header' });
    }
    const token  = authHeader.split(' ')[1];
    const userPb = new PocketBase(process.env.POCKETBASE_URL);
    userPb.authStore.save(token, null);
    const userData = await userPb.collection('users').authRefresh();
    req.user    = userData.record;
    req.pbToken = token;
    next();
  } catch (err) {
    console.error('[requireAuth error]', err.status, err.message);
    return res.status(401).json({ error: true, message: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ error: true, message: 'Admin access required' });
}

module.exports = { requireAuth, requireAdmin };
