import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKEND } from '../config/api';

const decodeToken = (token) => {
  try {
    const b64 = token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
    return JSON.parse(atob(b64));
  } catch { return null; }
};

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user:    null,
      token:   null,
      loading: false,

      isAuthenticated: () => {
        const { token, user } = get();
        if (!token || !user) return false;
        const p = decodeToken(token);
        if (!p) return !!(token && user);
        if (p.exp && p.exp * 1000 < Date.now()) {
          set({ token: null, user: null });
          return false;
        }
        return true;
      },

      doLogin: async (email, password) => {
        set({ loading: true });
        try {
          const res = await fetch(`${BACKEND}/api/auth/login`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ email, password }),
          });
          const data = await res.json();
          if (data.success && data.token) {
            // Normaliser le rôle pour la navigation
            const user = data.user;
            // Médecins indépendants → même navigateur
            if (['medecin_prive','medecin_conseil'].includes(user.role))
              user.role = 'medecin_independant';
            // Médecin résident → navigateur médecin
            // (garde 'medecin' tel quel)
            set({ user, token: data.token, loading: false });
            return { success: true };
          }
          set({ loading: false });
          return { success: false, message: data.message || 'Identifiants incorrects' };
        } catch (e) {
          set({ loading: false });
          return { success: false, message: 'Erreur réseau' };
        }
      },

      doRegister: async (payload) => {
        set({ loading: true });
        try {
          const res = await fetch(`${BACKEND}/api/auth/register`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload),
          });
          const data = await res.json();
          if (data.success && data.token) {
            set({ user: data.user, token: data.token, loading: false });
            return { success: true };
          }
          set({ loading: false });
          return { success: false, message: data.message || 'Erreur inscription' };
        } catch (e) {
          set({ loading: false });
          return { success: false, message: 'Erreur réseau' };
        }
      },

      logout: () => set({ user: null, token: null }),

      updateUser: (updates) => set(s => ({ user: { ...s.user, ...updates } })),
    }),
    {
      name:    'mediconnect-auth',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
