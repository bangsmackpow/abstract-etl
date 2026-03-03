const express    = require('express');
const router     = express.Router();
const PocketBase = require('pocketbase/cjs');
const { requireAuth } = require('../middleware/requireAuth');

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: true, message: 'Email and password required' });
  }
  try {
    const userPb   = new PocketBase(process.env.POCKETBASE_URL);
    const authData = await userPb.collection('users').authWithPassword(email, password);
    res.json({
      token:  authData.token,
      record: {
        id:    authData.record.id,
        email: authData.record.email,
        name:  authData.record.name,
        role:  authData.record.role,
      }
    });
  } catch (err) {
    console.error('[Login error] status=%s message=%s', err.status, err.message);
    if (err.status === 400 || err.status === 401 || err.status === 404) {
      return res.status(401).json({ error: true, message: 'Invalid email or password' });
    }
    return res.status(500).json({ error: true, message: 'Login failed: ' + err.message });
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({
    id:    req.user.id,
    email: req.user.email,
    name:  req.user.name,
    role:  req.user.role,
  });
});

module.exports = router;
