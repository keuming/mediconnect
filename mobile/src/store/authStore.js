import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND } from '../config/api';

const login = async (email, password) => {
  const res = await fetch(`${BACKEND}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
};

const decodeToken = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(b64));
  } catch { return null; }
};

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user:    null,
      token:   null,
      loading: false,

      // ── Vérification session ─────────────────────────────────
      isAuthenticated: () => {
        const { token, user } = get();
        if (!token || !user) return false;
        const payload = decodeToken(token);
        if (!payload) return !!(token && user); // fallback permissif
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          set({ token: null, user: null });
          return false;
        }
        // Récupérer rôle depuis JWT si absent du user
        if (!user.role && payload.role) {
          set(s => ({
            user: {
              ...s.user,
              role:        payload.role,
              clinique_id: s.user.clinique_id || payload.clinique_id || null,
              patient_id:  s.user.patient_id  || payload.patient_id  || null,
              medecin_id:  s.user.medecin_id  || payload.medecin_id  || null,
            }
          }));
        }
        return true;
      },

      // ── Connexion ─────────────────────────────────────────────
      doLogin: async (email, password) => {
        set({ loading: true });
        try {
          const data = await login(email.trim().toLowerCase(), password);
          if (data.success && data.token && data.user) {
            const user = { ...data.user };
            // Normaliser le rôle
            const payload = decodeToken(data.token);
            if (!user.role && payload?.role) Object.assign(user, {
              role:        payload.role,
              clinique_id: payload.clinique_id || null,
              patient_id:  payload.patient_id  || null,
              medecin_id:  payload.medecin_id  || null,
            });
            if (['medecin_prive', 'medecin_conseil'].includes(user.role)) {
              user.role = 'medecin_independant';
            }
            set({ token: data.token, user, loading: false });
            return { success: true, user };
          }
          set({ loading: false });
          return { success: false, message: data.message || 'Identifiants incorrects' };
        } catch (e) {
          set({ loading: false });
          return { success: false, message: 'Erreur réseau — vérifiez votre connexion' };
        }
      },

      // ── Déconnexion ────────────────────────────────────────────
      logout: () => set({ user: null, token: null }),

      // ── Mise à jour user ───────────────────────────────────────
      updateUser: (updates) => set(s => ({ user: { ...s.user, ...updates } })),
    }),
    {
      name: 'mediconnect-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: s => ({ token: s.token, user: s.user }),
    }
  )
);
