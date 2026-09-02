import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const APP_VERSION = 'v1.2.0'; // Placeholder for current application version

export default function Navbar() {
  const { user, logout, isAdmin, isPlatformAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <span className="navbar-brand">
        📋 Abstract ETL <span className="version-badge">{APP_VERSION}</span>
      </span>
      <Link to="/app" className="navbar-link">
        Dashboard
      </Link>
      <Link to="/app/jobs/new" className="navbar-link">
        + New Job
      </Link>
      <Link to="/app/jobs/bulk" className="navbar-link">
        Bulk Import
      </Link>
      {isAdmin && (
        <Link to="/app/admin" className="navbar-link">
          Admin
        </Link>
      )}
      {isPlatformAdmin && (
        <Link to="/app/platform" className="navbar-link">
          Platform
        </Link>
      )}
      <Link to="/app/docs" className="navbar-link">
        Docs
      </Link>
      <Link to="/app/billing" className="navbar-link">
        Billing
      </Link>
      <Link to="/app/security" className="navbar-link">
        Security
      </Link>
      <div className="navbar-spacer" />
      {user?.tenantName && <span className="navbar-tenant">{user.tenantName}</span>}
      <span className="navbar-user">{user?.name || user?.email}</span>
      <button
        className="navbar-link"
        onClick={handleLogout}
        style={{ background: 'none', border: 'none' }}
      >
        Sign Out
      </button>
    </nav>
  );
}
