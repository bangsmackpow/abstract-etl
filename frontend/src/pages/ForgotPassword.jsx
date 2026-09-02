import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-title">🔑 Reset Password</div>
        <div className="login-subtitle">We will email you a one-time reset link</div>
        {error && <div className="alert alert-error">{error}</div>}

        {sent ? (
          <div className="alert alert-info" style={{ marginTop: 8 }}>
            If an account exists for <strong>{email}</strong>, a password reset link has been sent. It expires
            in 1 hour.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                className="form-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
              type="submit"
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : 'Send Reset Link'}
            </button>
          </form>
        )}

        <p style={{ marginTop: 16, fontSize: 12, color: '#aaa', textAlign: 'center' }}>
          <Link to="/login">← Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}