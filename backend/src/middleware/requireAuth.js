const PocketBase = require('pocketbase/cjs');

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: true, message: 'Missing or invalid authorization header' });
    }
    const token = authHeader.split(' ')[1];
    
    // Create a per-request instance to avoid singleton state issues
    const authPb = new PocketBase(process.env.POCKETBASE_URL);
    authPb.authStore.save(token, null);
    
    if (!authPb.authStore.isValid) {
       return res.status(401).json({ error: true, message: 'Invalid or expired token' });
    }

    // Try to get user data from the store
    // If authStore.model is null, we need one fetch.
    // authRefresh is best, but if it fails with 401 "User not found" 
    // it means the user was deleted or the token is from a different PB instance.
    try {
      const userData = await authPb.collection('users').authRefresh();
      req.user    = userData.record;
      // Safety: ensure role exists
      if (!req.user.role) req.user.role = 'abstractor'; 
      req.pbToken = token;
      next();
    } catch (err) {
      console.error('[requireAuth] PB Refresh Error:', err.status, err.message);
      // Detailed error if possible
      const msg = err.status === 401 ? 'Session expired or user not found' : 'Authentication service unavailable';
      return res.status(401).json({ error: true, message: msg });
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
