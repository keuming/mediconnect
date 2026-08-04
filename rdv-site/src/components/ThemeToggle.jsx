// rdv-site/src/components/ThemeToggle.jsx
import React from 'react';
import { V } from '../theme';
import useThemeStore from '../context/themeStore';

export default function ThemeToggle() {
  const mode = useThemeStore(s => s.mode);
  const toggleTheme = useThemeStore(s => s.toggleTheme);
  return (
    <button
      onClick={toggleTheme}
      aria-label={mode === 'light' ? 'Passer au thème sombre' : 'Passer au thème clair'}
      title={mode === 'light' ? 'Thème sombre' : 'Thème clair'}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 36, height: 36, borderRadius: '50%',
        background: V.hover, border: `1px solid ${V.border}`,
        color: V.text, fontSize: 16, cursor: 'pointer', flexShrink: 0,
      }}
    >
      {mode === 'light' ? '🌙' : '☀️'}
    </button>
  );
}
