const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { users, jobs } = require('../db/schema');
const { eq, sql, avg, count } = require('drizzle-orm');
const { requireAuth, requireAdmin } = require('../middleware/requireAuth');
const { hashPassword } = require('../services/authService');
const { createError } = require('../middleware/errorHandler');

router.use(requireAuth);
router.use(requireAdmin);

/**
 * GET /api/admin/metrics
 * Returns aggregated metrics for the dashboard.
 */
router.get('/metrics', async (req, res) => {
  // Total jobs per user
  const jobsPerUser = await db.select({
    userId: users.id,
    userName: users.name,
    jobCount: count(jobs.id),
    avgProcessingTime: avg(jobs.processingTimeMs)
  })
  .from(users)
  .leftJoin(jobs, eq(users.id, jobs.createdBy))
  .groupBy(users.id);

  // Overall stats
  const [overall] = await db.select({
    totalJobs: count(jobs.id),
    avgProcessingTime: avg(jobs.processingTimeMs)
  }).from(jobs);

  res.json({
    perUser: jobsPerUser,
    overall: overall
  });
});

/**
 * GET /api/admin/users
 * List all users.
 */
router.get('/users', async (req, res) => {
  const allUsers = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
    createdAt: users.createdAt
  }).from(users);
  res.json(allUsers);
});

/**
 * POST /api/admin/users
 * Create a new user.
 */
router.post('/users', async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    throw createError('Name, email, and password are required', 400);
  }

  const hashedPassword = await hashPassword(password);

  try {
    const [newUser] = await db.insert(users).values({
      name,
      email,
      password: hashedPassword,
      role: role || 'abstractor'
    }).returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role
    });

    res.status(201).json(newUser);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      throw createError('Email already exists', 400);
    }
    throw err;
  }
});

/**
 * PATCH /api/admin/users/:id/password
 * Change a user's password.
 */
router.patch('/users/:id/password', async (req, res) => {
  const { password } = req.body;

  if (!password) {
    throw createError('New password is required', 400);
  }

  const hashedPassword = await hashPassword(password);

  await db.update(users)
    .set({ 
      password: hashedPassword,
      updatedAt: sql`(strftime('%s', 'now'))`
    })
    .where(eq(users.id, req.params.id));

  res.json({ success: true, message: 'Password updated successfully' });
});

/**
 * DELETE /api/admin/users/:id
 * Delete a user.
 */
router.delete('/users/:id', async (req, res) => {
  // Prevent deleting self
  if (req.params.id === req.user.id) {
    throw createError('Cannot delete your own account', 400);
  }

  await db.delete(users).where(eq(users.id, req.params.id));
  res.json({ success: true });
});

module.exports = router;
