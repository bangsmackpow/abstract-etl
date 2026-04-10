const pb = require('../services/pocketbaseClient');

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: true, message: 'Missing or invalid authorization header' });
    }
    const token = authHeader.split(' ')[1];
    
    // Set the token on the global PB client for this request scope
    // Note: Since this is a singleton, concurrent requests might interfere 
    // if not careful, but PocketBase's JS SDK handles authStore per-instance.
    // However, the 'pocketbaseClient.js' exports a SINGLETON.
    // To be safe and avoid multi-user interference on a singleton:
    // We SHOULD use a per-request instance or at least verify the token.
    
    // Let's use a dedicated instance for verification to avoid polluting the admin singleton
    const PocketBase = require('pocketbase/cjs');
    const authPb = new PocketBase(process.env.POCKETBASE_URL);
    authPb.authStore.save(token, null);
    
    if (!authPb.authStore.isValid) {
       return res.status(401).json({ error: true, message: 'Invalid or expired token' });
    }

    // Instead of refreshing every time (which hits DB), 
    // we can trust the token if it's valid, but we need the user record.
    // Let's try to get the user from the token without a full refresh if possible,
    // or just accept that we need one hit to PB.
    
    try {
      // authRefresh is the most reliable way to get the latest user record + verify
      const userData = await authPb.collection('users').authRefresh();
      req.user    = userData.record;
      req.pbToken = token;
      next();
    } catch (err) {
      console.error('[requireAuth refresh error]', err.status, err.message);
      return res.status(401).json({ error: true, message: 'Session expired or user not found' });
    }
  } catch (err) {
    console.error('[requireAuth general error]', err.message);
    return res.status(401).json({ error: true, message: 'Authentication failed' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ error: true, message: 'Admin access required' });
}

module.exports = { requireAuth, requireAdmin };
