import { useState } from 'react';
import { enableMfa, disableMfa, changeMyPassword } from '../services/api';
import { useAuth } from '../hooks/useAuth';

export default function Security() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [mfaMsg, setMfaMsg] = useState('');
  const [mfaDisablePassword, setMfaDisablePassword] = useState('');
  const [loading, setLoading] = useState(false);

  const mfaEnabled = Boolean(user?.mfaEnabled);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMsg('');
    if (newPassword !== confirmPassword) {
      setPwMsg('Error: New passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await changeMyPassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwMsg('Password updated successfully');
    } catch (err) {
      setPwMsg(`Error: ${err.response?.data?.message || 'Failed to change password'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEnableMfa = async () => {
    setMfaMsg('');
    try {
      const r = await enableMfa();
      setMfaMsg(`MFA enabled. A verification code was sent to ${r.otpSentTo || 'your email'}.`);
    } catch (err) {
      setMfaMsg(`Error: ${err.response?.data?.message || 'Failed to enable MFA'}`);
    }
  };

  const handleDisableMfa = async () => {
    setMfaMsg('');
    if (!mfaDisablePassword) {
      setMfaMsg('Error: enter your current password to disable MFA');
      return;
    }
    try {
      await disableMfa(mfaDisablePassword);
      setMfaDisablePassword('');
      setMfaMsg('MFA disabled');
      window.location.reload();
    } catch (err) {
      setMfaMsg(`Error: ${err.response?.data?.message || 'Failed to disable MFA'}`);
    }
  };

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue-dark)', marginBottom: 20 }}>
        Account Security
      </h1>

      <div className="card mb-4">
        <div className="card-header">Two-Factor Authentication (MFA)</div>
        <div className="card-body">
          {mfaMsg && <div className={`alert ${mfaMsg.startsWith('Error') ? 'alert-error' : 'alert-info'} mb-3`}>{mfaMsg}</div>}
          <p className="text-muted text-sm" style={{ marginBottom: 12 }}>
            {mfaEnabled
              ? 'MFA is enabled. You will be emailed a verification code each time you sign in.'
              : 'Add an extra layer of security: you will be emailed a one-time code after your password.'}
          </p>
          {mfaEnabled ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                className="form-input"
                type="password"
                placeholder="Current password to disable"
                style={{ flex: 1, minWidth: 220 }}
                value={mfaDisablePassword}
                onChange={(e) => setMfaDisablePassword(e.target.value)}
              />
              <button className="btn btn-ghost btn-sm text-error" onClick={handleDisableMfa}>Disable MFA</button>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={handleEnableMfa}>Enable MFA</button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">Change Password</div>
        <form className="card-body" onSubmit={handleChangePassword}>
          {pwMsg && <div className={`alert ${pwMsg.startsWith('Error') ? 'alert-error' : 'alert-info'} mb-3`}>{pwMsg}</div>}
          <div className="mb-3">
            <label className="form-label">Current Password</label>
            <input className="form-input" type="password" required value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div className="mb-3">
            <label className="form-label">New Password</label>
            <input className="form-input" type="password" required minLength={8} value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div className="mb-4">
            <label className="form-label">Confirm New Password</label>
            <input className="form-input" type="password" required value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}