import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getBillingStatus, createCheckoutSession, openBillingPortal } from '../services/api';

const PLAN_DETAILS = {
  solo: { name: 'Solo', price: '$159/mo', desc: '1 user · Unlimited jobs' },
  team: { name: 'Team', price: '$299/mo', desc: '5 users · Unlimited jobs' },
  enterprise: { name: 'Enterprise', price: '$499/mo', desc: 'Unlimited users · Dedicated instance' },
};

export default function Billing() {
  const [searchParams] = useSearchParams();
  const [billing, setBilling] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (searchParams.get('success')) setMsg('Your subscription is being activated. Thanks!');
    if (searchParams.get('canceled')) setMsg('Checkout was canceled. No changes were made.');
    getBillingStatus().then(setBilling).catch(() => setMsg('Failed to load billing status.'));
  }, [searchParams]);

  const handleUpgrade = async (plan) => {
    setBusy(true);
    setMsg('');
    try {
      const { url } = await createCheckoutSession(plan);
      window.location.href = url;
    } catch (err) {
      setMsg(`Error: ${err.response?.data?.message || 'Failed to start checkout'}`);
      setBusy(false);
    }
  };

  const handleManage = async () => {
    setBusy(true);
    setMsg('');
    try {
      const { url } = await openBillingPortal();
      window.location.href = url;
    } catch (err) {
      setMsg(`Error: ${err.response?.data?.message || 'Failed to open billing portal'}`);
      setBusy(false);
    }
  };

  const planLabel = (billing?.plan && PLAN_DETAILS[billing.plan]) ? PLAN_DETAILS[billing.plan].name : (billing?.plan || '—');
  const isActive = billing?.hasActiveSubscription;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue-dark)', marginBottom: 20 }}>Billing & Plan</h1>

      {msg && <div className={`alert ${msg.startsWith('Error') ? 'alert-error' : 'alert-info'} mb-4`}>{msg}</div>}

      <div className="card mb-4">
        <div className="card-header">Current Plan</div>
        <div className="card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--blue-dark)', textTransform: 'capitalize' }}>
                {planLabel}
              </div>
              <div className="text-muted text-sm">
                {billing?.trialActive && `Free trial ends ${new Date(billing.trialEndsAt * 1000).toLocaleDateString()}`}
                {billing?.hasActiveSubscription && 'Subscription active'}
                {billing?.trialExpired && !billing?.hasActiveSubscription && 'Trial expired — choose a plan to continue'}
              </div>
            </div>
            {isActive && (
              <button className="btn btn-outline" onClick={handleManage} disabled={busy}>
                Manage Subscription
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(PLAN_DETAILS).map(([key, p]) => (
          <div key={key} className={`card ${billing?.plan === key ? 'card-highlight' : ''}`} style={{ border: billing?.plan === key ? '2px solid var(--blue-mid)' : undefined }}>
            <div className="card-body" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--blue-dark)' }}>{p.name}</div>
              <div style={{ fontSize: 28, fontWeight: 800, margin: '8px 0' }}>{p.price}</div>
              <div className="text-muted text-sm" style={{ marginBottom: 16 }}>{p.desc}</div>
              {billing?.plan === key ? (
                <span className="status-badge status-complete">Current</span>
              ) : (
                <button className="btn btn-primary w-full" onClick={() => handleUpgrade(key)} disabled={busy}>
                  {busy ? 'Redirecting...' : `Choose ${p.name}`}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}