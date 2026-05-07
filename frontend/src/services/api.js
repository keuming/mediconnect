import axios from 'axios';

// URL du backend MediConnect — priorité à la variable d'environnement
// Note : VITE_API_URL doit être définie dans Vercel ou votre fichier .env
const BASE_URL = import.meta.env.VITE_API_URL || 'https://mediconnect-fed6.vercel.app';

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Injecter le token JWT à chaque requête
api.interceptors.request.use((config) => {
  try {
    // Récupération multi-sources pour compatibilité Zustand persist
    const authKeys = ['mediconnect-auth', 'auth-storage'];
    let token = null;

    for (const key of authKeys) {
      const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Gestion des structures { state: { token } } ou { token }
        token = parsed?.state?.token || parsed?.token;
        if (token) break;
      }
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    console.error("Erreur lors de la récupération du token:", e);
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Gestion globale des erreurs de réponse
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si l'erreur est une expiration de session (401)
    if (error.response?.status === 401) {
      try {
        localStorage.removeItem('mediconnect-auth');
        localStorage.removeItem('auth-storage');
        sessionStorage.removeItem('mediconnect-auth');
      } catch (e) {}

      // Redirige vers login seulement si on n'y est pas déjà
      if (!window.location.pathname.includes('/login')) {
        window.location.replace('/login?expired=true');
      }
    }
    return Promise.reject(error);
  }
);

export default api;