import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Home from './pages/Home';
import RDV from './pages/RDV';
import Confirmation from './pages/Confirmation';
import useThemeStore from './context/themeStore';
import { V, PALETTE_LIGHT, PALETTE_DARK } from './theme';

export default function App() {
  const mode = useThemeStore(s => s.mode);
  // Meme mecanisme que le dashboard clinique : on mute l'objet V partage
  // AVANT le rendu des pages enfants (elles importent la meme reference).
  Object.assign(V, mode === 'light' ? PALETTE_LIGHT : PALETTE_DARK);
  return (
    <BrowserRouter>
      <Toaster position="top-center" toastOptions={{
        duration: 4000,
        style: { background: V.card, color: V.text, border: `1px solid ${V.border}`, fontSize: 14, borderRadius: 12 },
        success: { iconTheme: { primary: V.green, secondary: '#fff' } },
        error:   { iconTheme: { primary: '#E11D48', secondary: '#fff' } },
      }} />
      {/* key={mode} force le remontage complet au changement de theme,
          pour que Home/RDV/Confirmation relisent V a jour. */}
      <div key={mode}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/rdv" element={<RDV />} />
          <Route path="/confirmation" element={<Confirmation />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
