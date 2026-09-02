const Stripe = require('stripe');
const { env } = require('../env');
const { db } = require('../db');
const { tenants } = require('../db/schema');
const { eq, sql } = require('drizzle-orm');
const { getTenantById } = require('./tenantRepo');

/**
 * Stripe billing (Track 5) — test mode to start. Tier prices map to Stripe
 * Price IDs supplied via env (validated in env.js):
 *   STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
 *   STRIPE_PRICE_SOLO, STRIPE_PRICE_TEAM, STRIPE_PRICE_ENTERPRISE
 */

const PLANS = {
  solo: { name: 'Solo', priceId: env.STRIPE_PRICE_SOLO },
  team: { name: 'Team', priceId: env.STRIPE_PRICE_TEAM },
  enterprise: { name: 'Enterprise', priceId: env.STRIPE_PRICE_ENTERPRISE },
};

function getStripe() {
  const key = env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(key);
}

async function getOrCreateCustomer(tenant) {
  const stripe = getStripe();
  if (tenant.stripeCustomerId) return tenant.stripeCustomerId;
  const customer = await stripe.customers.create({
    name: tenant.name,
    metadata: { tenantId: tenant.id },
  });
  await db
    .update(tenants)
    .set({ stripeCustomerId: customer.id, updatedAt: sql`(strftime('%s', 'now'))` })
    .where(eq(tenants.id, tenant.id));
  return customer.id;
}

async function getCheckoutUrl(tenantId, plan) {
  const tenant = await getTenantById(tenantId);
  if (!tenant) throw new Error('Tenant not found');
  const cfg = PLANS[plan];
  if (!cfg || !cfg.priceId) throw new Error(`Plan "${plan}" has no Stripe price configured`);

  const stripe = getStripe();
  const customerId = await getOrCreateCustomer(tenant);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: cfg.priceId, quantity: 1 }],
    success_url: `${env.APP_URL}/app/billing?success=1`,
    cancel_url: `${env.APP_URL}/app/billing?canceled=1`,
    metadata: { tenantId: tenant.id, plan },
  });
  return session.url;
}

async function getPortalUrl(tenantId) {
  const tenant = await getTenantById(tenantId);
  if (!tenant) throw new Error('Tenant not found');
  const stripe = getStripe();
  const customerId = tenant.stripeCustomerId || await getOrCreateCustomer(tenant);
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${env.APP_URL}/app/billing`,
  });
  return session.url;
}

/**
 * Handle a Stripe webhook event (verified signature). Returns the updated
 * tenant when the event affects billing state.
 */
async function handleWebhook(rawBody, signature) {
  const stripe = getStripe();
  const secret = env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not configured');

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    throw new Error(`Webhook signature verification failed: ${err.message}`);
  }

  const tenantId = event.data?.object?.metadata?.tenantId;

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const subId = session.subscription;
      const tid = session.metadata?.tenantId;
      if (!tid) break;
      const updates = {
        stripeSubscriptionId: subId || null,
        subscriptionStatus: 'active',
        updatedAt: sql`(strftime('%s', 'now'))`,
      };
      if (session.metadata?.plan) updates.plan = session.metadata.plan;
      await db.update(tenants).set(updates).where(eq(tenants.id, tid));
      break;
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object;
      const cid = sub.customer;
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.stripeCustomerId, cid))
        .limit(1);
      if (tenant) {
        await db
          .update(tenants)
          .set({
            stripeSubscriptionId: sub.id,
            subscriptionStatus: sub.status === 'active' || sub.status === 'trialing' ? 'active' : (sub.status || 'none'),
            subscriptionEndsAt: sub.current_period_end || null,
            updatedAt: sql`(strftime('%s', 'now'))`,
          })
          .where(eq(tenants.id, tenant.id));
      }
      break;
    }
    case 'customer.subscription.deleted':
    case 'invoice.payment_failed': {
      const sub = event.data.object;
      const cid = sub.customer;
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.stripeCustomerId, cid))
        .limit(1);
      if (tenant) {
        await db
          .update(tenants)
          .set({
            subscriptionStatus: 'past_due',
            updatedAt: sql`(strftime('%s', 'now'))`,
          })
          .where(eq(tenants.id, tenant.id));
      }
      break;
    }
    default:
      break;
  }

  return { received: true, event: event.type, tenantId };
}

module.exports = { PLANS, getCheckoutUrl, getPortalUrl, handleWebhook };
