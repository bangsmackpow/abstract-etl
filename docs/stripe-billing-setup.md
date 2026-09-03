# Stripe Billing Setup — Abstract ETL v3

Step-by-step guide to enable paid subscriptions (Solo / Team / Enterprise) with Stripe Billing. The app already has the code wired up (checkout, billing portal, webhooks, trial gating) — this doc covers the Stripe account/config side plus wiring the secrets into this repo's deployment.

**Stack:** Cloudflare → nginx proxy manager (NPM) → Docker (frontend nginx → Express backend).

**Tiers (must match the UI):**

| Plan key | Name | Price | Seats |
| :-- | :-- | :-- | :-- |
| `solo` | Solo | $159/mo | 1 user |
| `team` | Team | $299/mo | 5 users |
| `enterprise` | Enterprise | $499/mo | Dedicated instance |

---

## 0. What the app does (so the setup makes sense)

- `GET /api/billing/status` — returns the caller's tenant plan, trial expiry, subscription status.
- `POST /api/billing/checkout {plan}` — creates a Stripe **Checkout Session** (subscription mode) and returns a redirect URL. Used by `frontend/src/pages/Billing.jsx`.
- `POST /api/billing/portal` — opens Stripe's **Billing Portal** (manage/cancel subscription, invoices).
- `POST /api/billing/webhook` — receives Stripe events and updates `tenants.subscription_status` / `plan`. **Signature-verified.**
- Trial tenants get blocked from extraction (HTTP 402 `trial_expired`) when the 7-day trial ends without an active subscription.
- Events handled: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.

All tier prices/amounts live in **Stripe** (the Price objects), not in code. The UI only displays the amounts from the code (`frontend/src/pages/Landing.jsx`, `frontend/src/pages/Billing.jsx`) — keep those in sync with what you create in Stripe.

---

## 1. Create your Stripe account

1. Go to https://dashboard.stripe.com/register and create an account (or log in).
2. You'll get two modes, toggled at the top of the dashboard: **Test mode** and **Live mode**.
   - **Start in Test mode.** Everything here is fake-money and safe.
   - Live mode is toggled later (Section 7).
3. Recommended: enable **Test mode** right now (there's a toggle in the top-right of the dashboard).

---

## 2. Create the three Products + Prices (Test mode)

Products represent what you sell; Prices are the amounts (recurring per month). Create **one product per tier**, each with a **recurring monthly price**.

### Solo ($159/mo)
1. **Products** → **Add product** → name `Solo`.
2. **Pricing model:** choose **Standard pricing** → **Recurring** → **Monthly**.
3. Amount: `159.00` USD → **Save product**.
4. Stripe auto-creates a **Price** — copy its ID (looks like `price_1Q...`). You'll set it as `STRIPE_PRICE_SOLO`.

### Team ($299/mo)
1. Repeat with name `Team`, monthly, `299.00` USD. Copy Price ID → `STRIPE_PRICE_TEAM`.

### Enterprise ($499/mo)
1. Repeat with name `Enterprise`, monthly, `499.00` USD. Copy Price ID → `STRIPE_PRICE_ENTERPRISE`.

> **Note:** This app's Checkout sends `line_items: [{ price: <priceId>, quantity: 1 }]`. Enterprise = a fixed $499/mo "dedicated instance" price for now. If you later want per-seat or custom Enterprise pricing, that's a code change — out of scope here.

---

## 3. Configure the Billing Portal (so customers can cancel/manage)

1. Dashboard → **Settings** → **Billing** → **Billing portal**.
2. Configure what customers can do (typically: update payment method, view invoices, cancel subscription). Enable the options you want, e.g. "Allow customers to cancel their subscriptions."
3. Save. (No URL needed — the app generates the portal session URL per customer.)

---

## 4. Create the webhook endpoint (Test mode)

1. Dashboard → **Developers** → **Webhooks** → **Add endpoint**.
2. **Endpoint URL:** `https://abstract.builtnetworks.com/api/billing/webhook`
3. **Events to send** — select:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. **Add endpoint.**
5. On the endpoint's detail page, reveal the **Signing secret** (`whsec_...`). Copy it → `STRIPE_WEBHOOK_SECRET`.

> The webhook URL is public (no auth) because Stripe must reach it. Security comes from the signature in the `Stripe-Signature` header, which the app verifies using `STRIPE_WEBHOOK_SECRET`. The backend mounts the webhook with a **raw body parser** so the exact bytes reach `stripe.webhooks.constructEvent()` — do not put a JSON body parser in front of it at nginx/NPM (this is already correct in the code).

---

## 5. Gather your API keys (Test mode)

1. Dashboard → **Developers** → **API keys**.
2. **Secret key** (`sk_test_...`) → `STRIPE_SECRET_KEY`. (Never use the publishable key; the frontend never talks to Stripe directly.)

---

## 6. Wire the secrets into the deployment

Three places must know the Stripe values:

1. **`.env` (local dev, gitignored)** — add:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_SOLO=price_...
   STRIPE_PRICE_TEAM=price_...
   STRIPE_PRICE_ENTERPRISE=price_...
   ```
   (Reference: `.env.example` already lists these.)

2. **`stack.env`** — this repo tracks a **placeholder-only** `stack.env` (repo policy: never commit real secrets). Replace the `STRIPE_*` placeholders with the real **test** values in your **deployed copy** (e.g. on the Docker host), but keep the committed version as placeholders:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_SOLO=price_...
   STRIPE_PRICE_TEAM=price_...
   STRIPE_PRICE_ENTERPRISE=price_...
   ```

3. **`docker-compose.yml`** already maps `STRIPE_*` env vars into the backend container (added — see the `environment:` block). No change needed; it reads from the env file NPM/Portainer loads.

4. If you deploy via **Portainer**: open your stack, add the five `STRIPE_*` entries to the stack's **Environment variables** (or the env file it references), and redeploy.

5. **Restart / redeploy** the backend stack so the new env vars take effect. Verify:
   - `docker compose config` shows the `STRIPE_*` vars (if using CLI).
   - `docker logs abstract_backend` shows no "STRIPE_SECRET_KEY is not configured" errors.

---

## 7. Test the whole flow (Test mode)

1. **In the app:** create a trial tenant (sign up), or use an existing one. Go to **Billing** (`/app/billing`).
2. Click **Choose Solo**. You'll be redirected to Stripe Checkout (test mode).
3. Pay with the test card **`4242 4242 4242 4242`**, any future expiry, any CVC, any ZIP.
4. After payment you land back on `/app/billing?success=1`. The **Billing → status** API should now show `plan: "solo"`, `subscriptionStatus: "active"`.
5. **Webhook check:** Dashboard → **Developers → Webhooks** → your endpoint → **View details**. You should see recent `checkout.session.completed` deliveries with HTTP 200. If a delivery failed, click **Retry** after fixing the cause.
6. **Billing Portal:** in the app, click **Manage subscription** → should open the Stripe portal where you can cancel.
7. **Cancel flow:** cancel the subscription in the portal. Within a moment, `customer.subscription.deleted` fires → app sets `subscriptionStatus` to `past_due` → trial-gating logic treats the tenant as no longer active. (Note: the app currently sets `past_due` on delete — see `stripeService.js`. If you want `canceled` semantics, that's a small code tweak.)
8. **Trial expiry check:** a trial tenant that never subscribes gets HTTP 402 `trial_expired` from `POST /api/extract` after 7 days.

---

## 8. Go live

1. Toggle the dashboard to **Live mode**.
2. **Repeat Sections 2–4 in Live mode** (Live products/prices/webhook are separate from test mode).
3. Live webhook endpoint URL is the same; create a **new** live signing secret → `STRIPE_WEBHOOK_SECRET` in the deployed env (replacing the test one).
4. Update `STRIPE_SECRET_KEY` to the **live** `sk_live_...` key in the deployed env.
5. Redeploy the stack.
6. Verify a live test with a **real card** (or Stripe's live-mode test card `4000 0027 6000 3184`).
7. Check webhook deliveries again for 200s.
8. Update the tier amounts in the UI if they ever change (they currently match: $159/$299/$499).

---

## Troubleshooting

| Symptom | Likely cause | Fix |
| :-- | :-- | :-- |
| "STRIPE_SECRET_KEY is not configured" | Env not passed to container | Add to stack.env / Portainer env, redeploy; confirm `docker compose config` |
| Checkout URL returns error 500 | A price ID is empty/wrong | Verify `STRIPE_PRICE_*` IDs exist in Stripe (test mode) |
| Webhook delivery shows 4xx in Stripe | Signature mismatch, wrong body, or wrong event payload | Confirm `STRIPE_WEBHOOK_SECRET` is the **test** secret while in test mode; confirm URL is exactly `/api/billing/webhook` |
| "No active verification code" (MFA) unrelated — ignore | Not billing | — |
| Tenant shows `past_due` after cancel | App maps `customer.subscription.deleted` → `past_due` | Intentional for now; adjust `stripeService.js` if you want `canceled` |

---

## Files involved

- `backend/src/routes/billing.js` — status / checkout / portal / webhook routes
- `backend/src/services/stripeService.js` — Stripe client, Checkout/Billing-Portal session creation, webhook event handling
- `backend/src/env.js` — validates `STRIPE_*` env vars (optional; billing 500s until configured)
- `backend/src/middleware/requireAuth.js` — `requireActiveTrialOrSubscription` (trial gating on extract)
- `docker-compose.yml` — `STRIPE_*` env plumbing
- `frontend/src/pages/Billing.jsx` — in-app plan cards ($159/$299/$499) and checkout/portal buttons
- `frontend/src/pages/Landing.jsx` — marketing pricing section