import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import NewJob from './pages/NewJob';
import BulkImport from './pages/BulkImport';
import EditJob from './pages/EditJob';
import Security from './pages/Security';
import Admin from './pages/Admin';
import Platform from './pages/Platform';
import Docs from './pages/Docs';
import Billing from './pages/Billing';
import Navbar from './components/Navbar';

function ProtectedRoute({ children, adminOnly = false, platformOnly = false }) {
  const { user, isAdmin, isPlatformAdmin } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/app" replace />;
  if (platformOnly && !isPlatformAdmin) return <Navigate to="/app" replace />;
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

// Landing redirects to the app when already signed in.
function HomeRoute() {
  const { user } = useAuth();
  if (user) return <Navigate to="/app" replace />;
  return <Landing />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/jobs/new"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <NewJob />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/jobs/bulk"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <BulkImport />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/jobs/:id"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <EditJob />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/security"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Security />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/billing"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Billing />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/admin"
            element={
              <ProtectedRoute adminOnly>
                <AppLayout>
                  <Admin />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/platform"
            element={
              <ProtectedRoute platformOnly>
                <AppLayout>
                  <Platform />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/docs"
            element={
              <ProtectedRoute platformOnly>
                <AppLayout>
                  <Docs />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}