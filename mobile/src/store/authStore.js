// store/authStore.js — v2 avec debug connexion
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://mediconnect-backend-v2.vercel.app';

export const useAuthStore = create((set, get) => ({
  user:    null,
  token:   null,
  loading: false,
  error:   null,

  // ── Initialisation — recharge le token depuis AsyncStorage ─────
  init: async () => {
    try {
      const token = await AsyncStorage.getItem('mc_token');
      const user  = await AsyncStorage.getItem('mc_user');
      if (token && user) {
        set({ token, user: JSON.parse(user) });
      }
    } catch(e) {
      console.log('[authStore] init error:', e.message);
    }
  },

  // ── LOGIN ───────────────────────────────────────────────────────
  doLogin: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        set({ loading: false, error: data.message });
        return { success: false, message: data.message || 'Email ou mot de passe incorrect' };
      }

      // Sauvegarder token + user
      await AsyncStorage.setItem('mc_token', data.token);
      await AsyncStorage.setItem('mc_user', JSON.stringify({ ...data.user, token: data.token }));

      set({ loading: false, token: data.token, user: { ...data.user, token: data.token }, error: null });
      return { success: true };

    } catch(e) {
      const msg = e.message?.includes('Network') || e.message?.includes('fetch')
        ? 'Impossible de joindre le serveur. Vérifiez votre connexion internet.'
        : e.message;
      set({ loading: false, error: msg });
      return { success: false, message: msg };
    }
  },

  // ── REGISTER ────────────────────────────────────────────────────
  doRegister: async (userData) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        set({ loading: false, error: data.message });
        return { success: false, message: data.message || 'Erreur lors de l\'inscription' };
      }

      await AsyncStorage.setItem('mc_token', data.token);
      await AsyncStorage.setItem('mc_user', JSON.stringify({ ...data.user, token: data.token }));

      set({ loading: false, token: data.token, user: { ...data.user, token: data.token }, error: null });
      return { success: true };

    } catch(e) {
      set({ loading: false, error: e.message });
      return { success: false, message: e.message };
    }
  },

  // ── LOGOUT ──────────────────────────────────────────────────────
  logout: async () => {
    try {
      await AsyncStorage.removeItem('mc_token');
      await AsyncStorage.removeItem('mc_user');
    } catch(e) {}
    set({ user: null, token: null, error: null, loading: false });
  },

  // ── Mise à jour du profil local ─────────────────────────────────
  updateUser: async (updates) => {
    const current = get().user;
    const updated = { ...current, ...updates };
    await AsyncStorage.setItem('mc_user', JSON.stringify(updated));
    set({ user: updated });
  },
}));
