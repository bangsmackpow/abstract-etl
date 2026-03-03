import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Login      from './pages/Login';
import Dashboard  from './pages/Dashboard';
import NewJob     from './pages/NewJob';
import EditJob    from './pages/EditJob';
import Admin      from './pages/Admin';
import Navbar     from './components/Navbar';

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, isAdmin } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return children;
}

function AppLayout({ children }) {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="page-content">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>
          } />
          <Route path="/jobs/new" element={
            <ProtectedRoute><AppLayout><NewJob /></AppLayout></ProtectedRoute>
          } />
          <Route path="/jobs/:id" element={
            <ProtectedRoute><AppLayout><EditJob /></AppLayout></ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute adminOnly><AppLayout><Admin /></AppLayout></ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
