import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../hooks/useAuthStore';

const styles = {
  root: { minHeight: '100vh', display: 'flex', flexDirection: 'column' },
  nav: {
    background: '#1a365d', color: 'white', padding: '0 24px',
    display: 'flex', alignItems: 'center', height: '56px', gap: '24px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  },
  brand: { fontWeight: '700', fontSize: '18px', color: 'white', textDecoration: 'none', marginRight: '16px' },
  navLink: { color: 'rgba(255,255,255,0.85)', textDecoration: 'none', fontSize: '14px', padding: '4px 0' },
  navLinkActive: { color: 'white', borderBottom: '2px solid #63b3ed' },
  spacer: { flex: 1 },
  userInfo: { fontSize: '13px', color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', gap: '16px' },
  logoutBtn: {
    background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white',
    padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px',
  },
  main: { flex: 1, padding: '32px 24px', maxWidth: '1400px', width: '100%', margin: '0 auto' },
};

export default function Layout() {
  const { user, logout, isAdmin } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div style={styles.root}>
      <nav style={styles.nav}>
        <Link to="/" style={styles.brand}>Abstract ETL</Link>
        <Link to="/" style={{ ...styles.navLink, ...(location.pathname === '/' ? styles.navLinkActive : {}) }}>
          Dashboard
        </Link>
        <Link to="/jobs/new" style={{ ...styles.navLink, ...(isActive('/jobs/new') ? styles.navLinkActive : {}) }}>
          + New Job
        </Link>
        {isAdmin() && (
          <Link to="/admin" style={{ ...styles.navLink, ...(isActive('/admin') ? styles.navLinkActive : {}) }}>
            Admin
          </Link>
        )}
        <div style={styles.spacer} />
        <div style={styles.userInfo}>
          <span>{user?.name || user?.email}</span>
          {isAdmin() && <span style={{ background: '#2b6cb0', padding: '2px 8px', borderRadius: '12px', fontSize: '11px' }}>ADMIN</span>}
          <button style={styles.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>
      </nav>
      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
