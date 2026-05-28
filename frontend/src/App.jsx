import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useAuthStore from './context/authStore';

import Login    from './pages/Login';
import Register from './pages/Register';
import DashboardPatient     from './pages/patient/Dashboard';
import DashboardClinique    from './pages/clinique/Dashboard';
import DashboardPharmacie   from './pages/pharmacie/Dashboard';
import DashboardLivreur     from './pages/livreur/Dashboard';
import DashboardAdmin       from './pages/admin/Dashboard';
import DashboardAssureur    from './pages/assureur/Dashboard';
import DashboardImagerie    from './pages/imagerie/Dashboard';
import DashboardLaboratoire from './pages/laboratoire/Dashboard';
import DashboardMedecin      from './pages/medecin/Dashboard';
import DashboardMedecinIndep  from './pages/medecin/DashboardIndependant';
import AppLayout from './components/layout/AppLayout';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const status = error?.response?.status;
        if (status === 401 || status === 403 || status === 404) return false;
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
      staleTime: 30 * 1000,
      cacheTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: { retry: 0 },
  },
});

const Loader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#060C12' }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
      <div style={{ color: '#8BA0B5', fontSize: 14 }}>Chargement de MediConnect…</div>
    </div>
  </div>
);

const PrivateRoute = ({ children, roles }) => {
  const { user, isAuthenticated } = useAuthStore();
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/login" replace />;
  return children;
};

const RoleRedirect = () => {
  const { user } = useAuthStore();
  const routes = {
    patient:             '/patient',
    clinique:            '/clinique',
    medecin:             '/medecin',
    medecin_independant: '/medecin/independant',
    medecin_prive:       '/medecin/independant',
    pharmacie:           '/pharmacie',
    livreur:             '/livreur',
    admin:               '/admin',
    assureur:            '/assureur',
    imagerie:            '/imagerie',
    laboratoire:         '/laboratoire',
  };
  const dest = routes[user?.role];
  if (!dest) {
    console.error('[RoleRedirect] Rôle inconnu:', user?.role);
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={dest} replace />;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{
          duration: 4000,
          style: { background: '#141E2B', color: '#F0F4F8', border: '1px solid #1E2F42', fontSize: 14 },
          success: { iconTheme: { primary: '#0A8F58', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#E11D48', secondary: '#fff' }, duration: 6000 },
        }} />

        <Suspense fallback={<Loader />}>
          <Routes>
            {/* Routes publiques */}
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/"         element={<Navigate to="/login" replace />} />
            <Route path="/app"      element={<PrivateRoute><RoleRedirect /></PrivateRoute>} />

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

            {/* Imagerie médicale */}
            <Route path="/imagerie/*" element={
              <PrivateRoute roles={['imagerie']}>
                <AppLayout role="imagerie"><DashboardImagerie /></AppLayout>
              </PrivateRoute>
            } />

            {/* Laboratoire */}
            <Route path="/laboratoire/*" element={
              <PrivateRoute roles={['laboratoire']}>
                <AppLayout role="laboratoire"><DashboardLaboratoire /></AppLayout>
              </PrivateRoute>
            } />

            {/* Médecin employé de clinique */}
            <Route path="/medecin/*" element={
              <PrivateRoute roles={['medecin']}>
                <AppLayout role="medecin"><DashboardMedecin /></AppLayout>
              </PrivateRoute>
            } />

            {/* Médecin indépendant */}
            <Route path="/medecin/independant/*" element={
              <PrivateRoute roles={['medecin_independant','medecin_prive']}>
                <AppLayout role="medecin_independant"><DashboardMedecinIndep /></AppLayout>
              </PrivateRoute>
            } />

            {/* 404 */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
