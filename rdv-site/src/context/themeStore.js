// rdv-site/src/context/themeStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Meme mecanisme que frontend/src/context/themeStore.js, mais mode
// par defaut = 'light' (demande explicite : le site public doit
// s'ouvrir en clair, contrairement au dashboard clinique).
const useThemeStore = create(
  persist(
    (set, get) => ({
      mode: 'light', // 'light' | 'dark'
      toggleTheme: () => set({ mode: get().mode === 'dark' ? 'light' : 'dark' }),
      setTheme: (mode) => set({ mode }),
    }),
    { name: 'mediconnect-rdv-theme' }
  )
);

export default useThemeStore;
