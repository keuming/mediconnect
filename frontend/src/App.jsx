import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useAuthStore from './context/authStore';

import Login    from './pages/Login';
import Register from './pages/Register';

import DashboardPatient          from './pages/patient/Dashboard';
import DashboardClinique         from './pages/clinique/Dashboard';
import DashboardMedecin          from './pages/medecin/Dashboard';
import DashboardMedecinIndep     from './pages/medecinIndependant/Dashboard';
import DashboardPharmacie        from './pages/pharmacie/Dashboard';
import DashboardLivreur          from './pages/livreur/Dashboard';
import DashboardAdmin            from './pages/admin/Dashboard';
import DashboardAssureur         from './pages/assureur/Dashboard';
import DashboardImagerie         from './pages/imagerie/Dashboard';
import DashboardLaboratoire      from './pages/laboratoire/Dashboard';
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
      staleTime: 5 * 60 * 1000,
    },
  },
});

// ── Redirection selon le rôle après login ────────────────────────
const ROLE_PATHS = {
  patient:             '/patient',
  clinique:            '/clinique',
  medecin:             '/medecin',
  medecin_independant: '/medecin-independant',
  pharmacie:           '/pharmacie',
  livreur:             '/livreur',
  admin:               '/admin',
  assureur:            '/assureur',
  imagerie:            '/imagerie',
  laboratoire:         '/laboratoire',
};

const PrivateRoute = ({ children, roles }) => {
  const { user, token } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/login" replace />;
  return children;
};

// Redirige vers le bon dashboard selon le rôle
const HomeRedirect = () => {
  const { user, token } = useAuthStore();
  if (!token || !user) return <Navigate to="/login" replace />;
  const path = ROLE_PATHS[user.role] || '/login';
  return <Navigate to={path} replace />;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Suspense fallback={<div style={{ padding: 40, color: '#fff', background: '#060C12', minHeight: '100vh' }}>Chargement…</div>}>
          <Routes>
            {/* Pages publiques */}
            <Route path="/login"    element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Redirection accueil → dashboard du rôle */}
            <Route path="/"    element={<HomeRedirect />} />
            <Route path="/app" element={<HomeRedirect />} />

            {/* ── Patient ── */}
            <Route path="/patient/*" element={
              <PrivateRoute roles={['patient']}>
                <AppLayout role="patient"><DashboardPatient /></AppLayout>
              </PrivateRoute>
            } />

            {/* ── Clinique ── */}
            <Route path="/clinique/*" element={
              <PrivateRoute roles={['clinique']}>
                <AppLayout role="clinique"><DashboardClinique /></AppLayout>
              </PrivateRoute>
            } />

            {/* ── Médecin employé ── */}
            <Route path="/medecin/*" element={
              <PrivateRoute roles={['medecin']}>
                <AppLayout role="medecin"><DashboardMedecin /></AppLayout>
              </PrivateRoute>
            } />

            {/* ── Médecin indépendant ── */}
            <Route path="/medecin-independant/*" element={
              <PrivateRoute roles={['medecin_independant']}>
                <AppLayout role="medecin_independant"><DashboardMedecinIndep /></AppLayout>
              </PrivateRoute>
            } />

            {/* ── Pharmacie ── */}
            <Route path="/pharmacie/*" element={
              <PrivateRoute roles={['pharmacie']}>
                <AppLayout role="pharmacie"><DashboardPharmacie /></AppLayout>
              </PrivateRoute>
            } />

            {/* ── Livreur ── */}
            <Route path="/livreur/*" element={
              <PrivateRoute roles={['livreur']}>
                <AppLayout role="livreur"><DashboardLivreur /></AppLayout>
              </PrivateRoute>
            } />

            {/* ── Admin ── */}
            <Route path="/admin/*" element={
              <PrivateRoute roles={['admin']}>
                <AppLayout role="admin"><DashboardAdmin /></AppLayout>
              </PrivateRoute>
            } />

            {/* ── Assureur ── */}
            <Route path="/assureur/*" element={
              <PrivateRoute roles={['assureur']}>
                <AppLayout role="assureur"><DashboardAssureur /></AppLayout>
              </PrivateRoute>
            } />

            {/* ── Imagerie médicale ── */}
            <Route path="/imagerie/*" element={
              <PrivateRoute roles={['imagerie']}>
                <AppLayout role="imagerie"><DashboardImagerie /></AppLayout>
              </PrivateRoute>
            } />

            {/* ── Laboratoire ── */}
            <Route path="/laboratoire/*" element={
              <PrivateRoute roles={['laboratoire']}>
                <AppLayout role="laboratoire"><DashboardLaboratoire /></AppLayout>
              </PrivateRoute>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
