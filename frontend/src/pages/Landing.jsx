import { Link } from 'react-router-dom';

const FEATURES = [
  { icon: '🤖', title: 'AI-Powered Extraction', desc: 'Native PDF pass-through to Gemini 2.5 Flash — no image conversion, no re-typing.' },
  { icon: '📋', title: 'Title Abstracts', desc: 'Generate clean, structured title-search reports in the format your clients expect.' },
  { icon: '🖨️', title: 'DOCX · PDF · Markdown', desc: 'Download polished, Word-editable reports or plain Markdown in one click.' },
  { icon: '🏢', title: 'Built for Title Companies', desc: 'Your whole team works the queue; each report is reviewed and corrected before delivery.' },
  { icon: '🔐', title: 'Tenant Isolation', desc: 'Each company gets its own workspace, users, and confidential jobs — fully isolated.' },
  { icon: '🖼️', title: 'Your Branding', desc: 'Upload your own logo — it is embedded on every report you generate.' },
];

const TIERS = [
  { name: 'Solo', price: '$45', per: '/month', users: '1 user', jobs: 'Unlimited jobs', highlight: false },
  { name: 'Team', price: '$99', per: '/month', users: '5 users', jobs: 'Unlimited jobs', highlight: true },
  { name: 'Enterprise', price: '$499', per: '/month', users: 'Unlimited users', jobs: 'Dedicated instance', highlight: false },
];

export default function Landing() {
  return (
    <div className="landing">
      {/* Nav */}
      <header className="landing-nav">
        <div className="landing-brand">📋 Abstract ETL</div>
        <nav className="landing-links">
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
          <Link to="/login" className="btn btn-ghost btn-sm">Log In</Link>
          <Link to="/signup" className="btn btn-primary btn-sm">Sign Up Free</Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="landing-hero">
        <h1>Title abstracts, powered by AI.</h1>
        <p className="landing-sub">
          Upload a search-order PDF. Abstract ETL reads every page and drafts a clean, structured
          title-search report you review and deliver. Start your free 7-day trial — no card required.
        </p>
        <div className="landing-cta">
          <Link to="/signup" className="btn btn-primary">Start Free Trial</Link>
          <Link to="/login" className="btn btn-outline">Log In</Link>
        </div>
        <div className="landing-note">7 days free · Cancel anytime</div>
      </section>

      {/* Features */}
      <section id="features" className="landing-section">
        <h2>Everything a title abstract company needs</h2>
        <div className="landing-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="landing-card">
              <div className="landing-card-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="landing-section">
        <h2>Simple per-company pricing</h2>
        <div className="landing-tiers">
          {TIERS.map((t) => (
            <div key={t.name} className={`landing-tier ${t.highlight ? 'landing-tier-highlight' : ''}`}>
              <h3>{t.name}</h3>
              <div className="landing-tier-price">{t.price}<span>{t.per}</span></div>
              <ul>
                <li>{t.users}</li>
                <li>{t.jobs}</li>
                <li>AI extraction + reports</li>
                <li>Tenant isolation + branding</li>
              </ul>
              <Link to="/signup" className={`btn ${t.highlight ? 'btn-primary' : 'btn-outline'} w-full`}>Get Started</Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div>📋 Abstract ETL</div>
        <div className="landing-footer-links">
          <Link to="/login">Log In</Link>
          <Link to="/signup">Sign Up</Link>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
        </div>
      </footer>
    </div>
  );
}