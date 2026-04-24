import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useAuthStore from './context/authStore';

// Pages publiques
import Login    from './pages/Login';
import Register from './pages/Register';

// Dashboards par rôle
import DashboardPatient   from './pages/patient/Dashboard';
import DashboardClinique  from './pages/clinique/Dashboard';
import DashboardPharmacie from './pages/pharmacie/Dashboard';
import DashboardLivreur   from './pages/livreur/Dashboard';
import DashboardAdmin     from './pages/admin/Dashboard';
import DashboardAssureur  from './pages/assureur/Dashboard';

// Layout commun
import AppLayout from './components/layout/AppLayout';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

// ── Guard de route privée ─────────────────────────────────────────
const PrivateRoute = ({ children, roles }) => {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/unauthorized" replace />;
  return children;
};

// ── Redirect selon le rôle ────────────────────────────────────────
const RoleRedirect = () => {
  const { user } = useAuthStore();
  const routes = {
    patient:   '/patient',
    clinique:  '/clinique',
    pharmacie: '/pharmacie',
    livreur:   '/livreur',
    admin:     '/admin',
    assureur:  '/assureur',
  };
  return <Navigate to={routes[user?.role] || '/login'} replace />;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{
          duration: 3500,
          style: { background: '#141E2B', color: '#F0F4F8', border: '1px solid #1E2F42' },
          success: { iconTheme: { primary: '#0A8F58', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#E11D48', secondary: '#fff' } },
        }} />

        <Routes>
          {/* Publiques */}
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/"         element={<Navigate to="/login" replace />} />

          {/* Redirect après login */}
          <Route path="/app" element={<PrivateRoute><RoleRedirect /></PrivateRoute>} />

          {/* Patient */}
          <Route path="/patient/*" element={
            <PrivateRoute roles={['patient']}>
              <AppLayout role="patient"><DashboardPatient /></AppLayout>
            </PrivateRoute>
          } />

          {/* Clinique */}
          <Route path="/clinique/*" element={
            <PrivateRoute roles={['clinique']}>
              <AppLayout role="clinique"><DashboardClinique /></AppLayout>
            </PrivateRoute>
          } />

          {/* Pharmacie */}
          <Route path="/pharmacie/*" element={
            <PrivateRoute roles={['pharmacie']}>
              <AppLayout role="pharmacie"><DashboardPharmacie /></AppLayout>
            </PrivateRoute>
          } />

          {/* Livreur */}
          <Route path="/livreur/*" element={
            <PrivateRoute roles={['livreur']}>
              <AppLayout role="livreur"><DashboardLivreur /></AppLayout>
            </PrivateRoute>
          } />

          {/* Admin */}
          <Route path="/admin/*" element={
            <PrivateRoute roles={['admin']}>
              <AppLayout role="admin"><DashboardAdmin /></AppLayout>
            </PrivateRoute>
          } />

          {/* Assureur */}
          <Route path="/assureur/*" element={
            <PrivateRoute roles={['assureur']}>
              <AppLayout role="assureur"><DashboardAssureur /></AppLayout>
            </PrivateRoute>
          } />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
