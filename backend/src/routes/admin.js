const express = require('express');
const router = express.Router();
const axios = require('axios');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const PB_URL = process.env.POCKETBASE_URL || 'http://localhost:8090';

/**
 * GET /api/admin/jobs
 * List ALL jobs across all users (admin only)
 */
router.get('/jobs', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { page = 1, perPage = 50, search = '', status = '', userId = '' } = req.query;

    let filter = '';
    const filters = [];

    if (search) {
      const e = search.replace(/"/g, '\\"');
      filters.push(`(property_address ~ "${e}" || borrower_names ~ "${e}" || county ~ "${e}")`);
    }
    if (status) filters.push(`status = "${status}"`);
    if (userId) filters.push(`created_by = "${userId}"`);

    filter = filters.join(' && ');

    const response = await axios.get(`${PB_URL}/api/collections/jobs/records`, {
      headers: { Authorization: `Bearer ${req.authToken}` },
      params: { page, perPage, filter, sort: '-created', expand: 'created_by' },
    });

    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

/**
 * GET /api/admin/users
 * List all users (admin only)
 */
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const response = await axios.get(`${PB_URL}/api/collections/users/records`, {
      headers: { Authorization: `Bearer ${req.authToken}` },
      params: { perPage: 200, sort: 'name' },
    });

    // Return safe fields only
    const users = response.data.items.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      created: u.created,
    }));

    res.json({ items: users, totalItems: response.data.totalItems });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * GET /api/admin/stats
 * Summary stats for admin dashboard
 */
router.get('/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [totalRes, draftRes, reviewRes, completeRes] = await Promise.all([
      axios.get(`${PB_URL}/api/collections/jobs/records`, {
        headers: { Authorization: `Bearer ${req.authToken}` },
        params: { perPage: 1 },
      }),
      axios.get(`${PB_URL}/api/collections/jobs/records`, {
        headers: { Authorization: `Bearer ${req.authToken}` },
        params: { perPage: 1, filter: 'status = "draft"' },
      }),
      axios.get(`${PB_URL}/api/collections/jobs/records`, {
        headers: { Authorization: `Bearer ${req.authToken}` },
        params: { perPage: 1, filter: 'status = "needs_review"' },
      }),
      axios.get(`${PB_URL}/api/collections/jobs/records`, {
        headers: { Authorization: `Bearer ${req.authToken}` },
        params: { perPage: 1, filter: 'status = "complete"' },
      }),
    ]);

    res.json({
      total: totalRes.data.totalItems,
      draft: draftRes.data.totalItems,
      needs_review: reviewRes.data.totalItems,
      complete: completeRes.data.totalItems,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
