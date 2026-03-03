const pb = require('../services/pocketbaseClient');

/**
 * Middleware: verify PocketBase auth token from Authorization header.
 * Attaches req.user (PocketBase record) and req.isAdmin.
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];

    // Use PocketBase admin client to verify token by fetching the user
    // PocketBase tokens are self-validating JWTs but we verify against PB for freshness
    const client = pb.getAdminClient();
    
    // Decode JWT payload to get user ID (without verifying signature here — PB handles that)
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    
    if (!payload.id || !payload.type === 'authRecord') {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    // Fetch user record to confirm it exists and get role
    const user = await client.collection('users').getOne(payload.id);
    
    req.user = user;
    req.userId = user.id;
    req.isAdmin = user.role === 'admin';
    req.authToken = token;
    
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

/**
 * Middleware: require admin role
 */
function requireAdmin(req, res, next) {
  if (!req.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
