import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { verifyOtp } from '../services/api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [needsMfa, setNeedsMfa] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.needsMfa) {
        setNeedsMfa(true);
        setOtp('');
      } else {
        window.location.href = '/app';
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await verifyOtp(email, otp);
      localStorage.setItem('auth_token', result.token);
      localStorage.setItem('auth_user', JSON.stringify(result.user));
      window.location.href = '/';
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-title">📋 Abstract ETL</div>
        <div className="login-subtitle">Title Abstract Management Tool</div>
        {error && <div className="alert alert-error">{error}</div>}

        {needsMfa ? (
          <>
            <div className="alert alert-info">
              A verification code was sent to <strong>{email}</strong>. Enter it below to finish signing in.
            </div>
            <form onSubmit={handleVerifyOtp}>
              <div className="form-group">
                <label className="form-label">Verification Code</label>
                <input
                  className="form-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
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
                {loading ? <span className="spinner" /> : 'Verify & Sign In'}
              </button>
            </form>
            <button
              className="btn btn-ghost"
              style={{ width: '100%', marginTop: 12 }}
              onClick={() => { setNeedsMfa(false); setOtp(''); }}
            >
              ← Back to sign in
            </button>
          </>
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
            <div className="form-group" style={{ marginBottom: 24 }}>
              <label className="form-label">Password</label>
              <input
                className="form-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" /> Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        )}

        {!needsMfa && (
          <p style={{ marginTop: 16, fontSize: 12, color: '#aaa', textAlign: 'center' }}>
            <Link to="/forgot-password">Forgot your password?</Link>
          </p>
        )}
      </div>
    </div>
  );
}