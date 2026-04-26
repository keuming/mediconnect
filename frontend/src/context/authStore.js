import { create } from 'zustand';
import { authAPI } from '../services/api';

const useAuthStore = create((set, get) => ({
  user:    JSON.parse(localStorage.getItem('mc_user') || 'null'),
  token:   localStorage.getItem('mc_token') || null,
  loading: false,
  error:   null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { data } = await authAPI.login({ email, password });
      if (!data.success || !data.token) throw new Error('Réponse invalide du serveur');
      localStorage.setItem('mc_token', data.token);
      localStorage.setItem('mc_user',  JSON.stringify(data.user));
      set({ user: data.user, token: data.token, loading: false, error: null });
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message
        || (err.code === 'ERR_NETWORK' ? 'Serveur inaccessible — vérifiez votre connexion' : null)
        || (err.code === 'ECONNABORTED' ? 'Délai d'attente dépassé — réessayez' : null)
        || err.message
        || 'Erreur de connexion';
      set({ loading: false, error: msg });
      return { success: false, message: msg };
    }
  },

  register: async (formData) => {
    set({ loading: true, error: null });
    try {
      const { data } = await authAPI.register(formData);
      if (!data.success || !data.token) throw new Error('Réponse invalide du serveur');
      localStorage.setItem('mc_token', data.token);
      localStorage.setItem('mc_user',  JSON.stringify(data.user));
      set({ user: data.user, token: data.token, loading: false, error: null });
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message
        || (err.code === 'ERR_NETWORK' ? 'Serveur inaccessible' : null)
        || err.message
        || "Erreur lors de l'inscription";
      set({ loading: false, error: msg });
      return { success: false, message: msg };
    }
  },

  logout: () => {
    localStorage.removeItem('mc_token');
    localStorage.removeItem('mc_user');
    set({ user: null, token: null, error: null });
  },

  isAuthenticated: () => {
    const { token, user } = get();
    if (!token || !user) return false;
    // Vérifier que le token n'est pas expiré côté client
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        // Token expiré — nettoyer
        localStorage.removeItem('mc_token');
        localStorage.removeItem('mc_user');
        return false;
      }
    } catch {
      return false;
    }
    return true;
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
