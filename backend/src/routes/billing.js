const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/requireAuth');
const { createError } = require('../middleware/errorHandler');
const { getTenantById } = require('../services/tenantRepo');
const { getCheckoutUrl, getPortalUrl, handleWebhook, PLANS } = require('../services/stripeService');

/**
 * GET /api/billing/status
 * Returns the caller's tenant plan, trial expiry, and subscription status.
 */
router.get('/status', requireAuth, async (req, res) => {
  const tenant = await getTenantById(req.tenantId);
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

  const trialActive = tenant.plan === 'trial' && tenant.trialEndsAt && tenant.trialEndsAt * 1000 > Date.now();
  const trialExpired = tenant.plan === 'trial' && tenant.trialEndsAt && tenant.trialEndsAt * 1000 <= Date.now();

  res.json({
    tenantId: tenant.id,
    name: tenant.name,
    plan: tenant.plan,
    subscriptionStatus: tenant.subscriptionStatus || 'none',
    trialEndsAt: tenant.trialEndsAt || null,
    trialActive,
    trialExpired,
    hasActiveSubscription: (tenant.subscriptionStatus || 'none') === 'active',
    plans: PLANS,
  });
});

/**
 * POST /api/billing/checkout { plan }
 * Creates a Stripe Checkout session and returns its redirect URL.
 */
router.post('/checkout', requireAuth, async (req, res) => {
  const { plan } = req.body || {};
  if (!plan || !PLANS[plan]) throw createError('Choose a valid plan (solo, team, enterprise)', 400);
  try {
    const url = await getCheckoutUrl(req.tenantId, plan);
    res.json({ url });
  } catch (err) {
    throw createError(err.message, 500);
  }
});

/**
 * POST /api/billing/portal
 * Returns the Stripe billing portal URL (manage subscription / invoices).
 */
router.post('/portal', requireAuth, async (req, res) => {
  try {
    const url = await getPortalUrl(req.tenantId);
    res.json({ url });
  } catch (err) {
    throw createError(err.message, 500);
  }
});

/**
 * POST /api/billing/webhook
 * Stripe webhook endpoint — raw body, signature-verified, no auth.
 * The raw body parser is mounted globally in index.js BEFORE express.json()
 * so the exact request bytes reach stripe.webhooks.constructEvent().
 */
router.post('/webhook', async (req, res) => {
  const signature = req.headers['stripe-signature'];
  if (!signature) return res.status(400).json({ error: 'Missing stripe-signature header' });
  try {
    const result = await handleWebhook(req.body, signature);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;