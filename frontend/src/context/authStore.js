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
        // Vérification de base — token ET user présents
        if (!token || !user) return false;
        try {
          // Décoder le JWT (format: header.payload.signature)
          const parts = token.split('.');
          if (parts.length !== 3) return false;
          // Remplacer les caractères URL-safe base64
          const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
          const payload = JSON.parse(atob(b64));
          // Token expiré ?
          if (payload.exp && payload.exp * 1000 < Date.now()) {
            console.warn('[authStore] Token expiré');
            set({ token: null, user: null });
            return false;
          }
          // Récupérer le rôle depuis le token si absent du user
          if (!user.role && payload.role) {
            set(state => ({
              user: {
                ...state.user,
                role:        payload.role,
                clinique_id: state.user.clinique_id || payload.clinique_id || null,
                patient_id:  state.user.patient_id  || payload.patient_id  || null,
                medecin_id:  state.user.medecin_id  || payload.medecin_id  || null,
              }
            }));
          }
          return true;
        } catch(e) {
          // Ne jamais bloquer sur une erreur de décodage JWT
          console.warn('[authStore] Erreur décodage JWT:', e.message);
          // Si le token existe et user existe, on fait confiance
          return !!(token && user);
        }
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
