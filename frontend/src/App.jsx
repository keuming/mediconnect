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
// Correction ici : On importe le fichier Dashboard.jsx que vous avez fourni
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

const PrivateRoute = ({ children, roles }) => {
  const { user, token } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/" replace />;
  return children;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Suspense fallback={<div className="p-10 text-white">Chargement...</div>}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Accueil / Redirection selon rôle */}
            <Route path="/" element={
              <PrivateRoute>
                <Navigate to={`/${useAuthStore.getState().user?.role}/dashboard`} replace />
              </PrivateRoute>
            } />

            {/* Patient */}
            <Route path="/patient/*" element={
              <PrivateRoute roles={['patient']}>
                <AppLayout role="patient"><DashboardPatient /></AppLayout>
              </PrivateRoute>
            } />

            {/* Médecin (Clinique et Indépendant) */}
            <Route path="/medecin/*" element={
              <PrivateRoute roles={['medecin']}>
                {/* On utilise le composant Dashboard qui correspond à votre fichier Dashboard.jsx */}
                <AppLayout role="medecin"><DashboardMedecin /></AppLayout>
              </PrivateRoute>
            } />

            {/* Pharmacie */}
            <Route path="/pharmacie/*" element={
              <PrivateRoute roles={['pharmacie']}>
                <AppLayout role="pharmacie"><DashboardPharmacie /></AppLayout>
              </PrivateRoute>
            } />

            {/* Autres rôles... */}
            <Route path="/livreur/*" element={
              <PrivateRoute roles={['livreur']}>
                <AppLayout role="livreur"><DashboardLivreur /></AppLayout>
              </PrivateRoute>
            } />

            <Route path="/admin/*" element={
              <PrivateRoute roles={['admin']}>
                <AppLayout role="admin"><DashboardAdmin /></AppLayout>
              </PrivateRoute>
            } />

            <Route path="/* " element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}