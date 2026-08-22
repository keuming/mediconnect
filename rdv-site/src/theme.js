// rdv-site/src/theme.js
//
// Meme mecanisme que frontend/src/pages/clinique/Dashboard.jsx :
// un objet mutable V, partage par toutes les pages via import, mis a
// jour par Object.assign(V, palette) dans App.jsx AVANT le rendu des
// pages enfants. Comme les modules ES sont des singletons, toute page
// qui importe { V } lit la meme reference, deja a jour au moment de
// son rendu -- pas besoin de refaire l'assignation dans chaque page.

export const PALETTE_DARK = {
  green: '#0A8F58', teal: '#0D9488', purple: '#7C3AED', amber: '#D97706',
  bg: '#060C12', card: '#0E1620', input: '#141E2B', hover: '#1A2535', border: '#1E2F42',
  text: '#F0F4F8', muted: '#8BA0B5', dim: '#4E657A',
  navBg: 'rgba(6,12,18,.95)', navBorder: 'rgba(255,255,255,.06)',
  footerBg: 'rgba(4,8,14,.9)', footerBorder: 'rgba(255,255,255,.05)',
};

export const PALETTE_LIGHT = {
  green: '#0A8F58', teal: '#0D9488', purple: '#7C3AED', amber: '#B45309',
  bg: '#F5F7FA', card: '#FFFFFF', input: '#FFFFFF', hover: '#F0F3F6', border: '#DCE3EA',
  // muted/dim assombris (etaient #5B6B7A/#8A97A3) -- trop pales sur le
  // fond quasi-blanc du theme clair, rendaient les sous-titres et labels
  // ternes malgre un ratio de contraste techniquement suffisant.
  text: '#101B26', muted: '#3E4C5A', dim: '#647082',
  navBg: 'rgba(255,255,255,.92)', navBorder: 'rgba(16,27,38,.08)',
  footerBg: '#EEF1F4', footerBorder: 'rgba(16,27,38,.06)',
};

// Clair par defaut -- App.jsx ecrase ces valeurs au premier rendu selon
// le mode stocke dans themeStore.
// eslint-disable-next-line prefer-const
export let V = { ...PALETTE_LIGHT };

// Convertit une couleur hexadecimale (ex: V.green = '#0A8F58') en chaine
// rgba() avec la transparence demandee -- utilise pour les bordures,
// ombres et surlignages semi-transparents de RDV.jsx/Confirmation.jsx,
// qui doivent rester coherents avec le theme actif (ex: un ambre a 20%
// d'opacite doit utiliser le VRAI ambre du theme courant, pas une
// valeur fixe qui ne changerait jamais entre clair et sombre).
export function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
