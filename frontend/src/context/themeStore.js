import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ── Store de thème (sombre / clair) ─────────────────────────────
// Persisté en localStorage pour se souvenir du choix de l'utilisateur.
const useThemeStore = create(
  persist(
    (set, get) => ({
      mode: 'dark', // 'dark' | 'light'
      toggleTheme: () => set({ mode: get().mode === 'dark' ? 'light' : 'dark' }),
      setTheme: (mode) => set({ mode }),
    }),
    { name: 'mediconnect-theme' }
  )
);

export default useThemeStore;
