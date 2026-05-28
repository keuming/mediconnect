import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const API = 'https://mediconnect-fed6.vercel.app/api';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user:    null,
      token:   null,
      loading: false,

      isAuthenticated: () => {
        const { token, user } = get();
        if (!token || !user) return false;
        // Vérifier expiration du token JWT
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.exp && payload.exp * 1000 < Date.now()) {
            // Token expiré — nettoyer
            set({ token: null, user: null });
            return false;
          }
        } catch { return false; }
        return true;
      },

      login: async (email, password) => {
        set({ loading: true });
        try {
          const res = await fetch(`${API}/auth/login`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ email, password }),
          });
          const data = await res.json();

          if (data.success && data.token && data.user) {
            // S'assurer que le rôle est bien présent
            const user = data.user;
            // Fallback : décoder le JWT si le rôle n'est pas dans data.user
            if (!user.role && data.token) {
              try {
                const payload = JSON.parse(atob(data.token.split('.')[1]));
                user.role = payload.role;
                user.clinique_id = user.clinique_id || payload.clinique_id;
                user.patient_id  = user.patient_id  || payload.patient_id;
                user.medecin_id  = user.medecin_id  || payload.medecin_id;
              } catch {}
            }
            set({ token: data.token, user, loading: false });
            return { success: true, user };
          }
          set({ loading: false });
          return { success: false, message: data.message || 'Email ou mot de passe incorrect' };
        } catch (e) {
          set({ loading: false });
          return { success: false, message: 'Erreur de connexion au serveur' };
        }
      },

      register: async (payload) => {
        set({ loading: true });
        try {
          const res = await fetch(`${API}/auth/register`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload),
          });
          const data = await res.json();

          if (data.success && data.token && data.user) {
            const user = data.user;
            if (!user.role && data.token) {
              try {
                const p = JSON.parse(atob(data.token.split('.')[1]));
                user.role = p.role || payload.role;
              } catch {}
            }
            // S'assurer que le rôle est normalisé
            if (user.role === 'medecin_prive') user.role = 'medecin_independant';
            set({ token: data.token, user, loading: false });
            return { success: true, user };
          }
          set({ loading: false });
          return { success: false, message: data.message || 'Erreur lors de l\'inscription' };
        } catch (e) {
          set({ loading: false });
          return { success: false, message: 'Erreur de connexion au serveur' };
        }
      },

      logout: () => {
        set({ user: null, token: null });
      },

      updateUser: (updates) => {
        set(state => ({ user: { ...state.user, ...updates } }));
      },
    }),
    {
      name: 'mediconnect-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);

export default useAuthStore;
