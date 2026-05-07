import axios from 'axios';

// URL du backend MediConnect — priorité à la variable d'environnement
const BASE_URL = import.meta.env.VITE_API_URL
  || 'https://mediconnect-fed6.vercel.app';

const api = axios.create({
  baseURL: BASE_URL + '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Injecter le token JWT à chaque requête
api.interceptors.request.use((config) => {
  try {
    // Compatibilité Zustand persist
    const raw = localStorage.getItem('mediconnect-auth')
      || localStorage.getItem('auth-storage')
      || sessionStorage.getItem('mediconnect-auth');
    if (raw) {
      const parsed = JSON.parse(raw);
      const token = parsed?.state?.token || parsed?.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch (e) {
    // Silencieux
  }
  return config;
});

// Gestion globale des erreurs
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expiré → vider le storage et rediriger
      try {
        localStorage.removeItem('mediconnect-auth');
        localStorage.removeItem('auth-storage');
      } catch (e) {}
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
