import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const APP_VERSION = 'v1.2.0'; // Placeholder for current application version

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
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
      <Link to="/" className="navbar-link">
        Dashboard
      </button>
      <Link to="/jobs/new" className="navbar-link">
        + New Job
      </Link>
      {isAdmin && (
        <Link to="/admin" className="navbar-link">
          Admin
        </Link>
      )}
      <div className="navbar-spacer" />
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
