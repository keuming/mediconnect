import React, { useState } from 'react';
import useThemeStore from '../../context/themeStore';

// ── Palette partagee, meme convention que le reste de l'application.
// Ce fichier exporte plusieurs composants INDEPENDANTS (pas un seul
// wrapper de page) : chaque composant appelle useAppliquerTheme() lui
// meme pour rester reactif au changement de theme.
const PALETTE_DARK = {
  card:'#141E2B', hover:'#1A2535', border:'#1E2F42', card2:'#0E1620',
  text:'#F0F4F8', muted:'#8BA0B5', dim:'#4E657A',
  green:'#0A8F58', teal:'#0D9488', amber:'#D97706', red:'#E11D48', blue:'#2563EB',
};
const PALETTE_LIGHT = {
  card:'#FFFFFF', hover:'#F0F3F6', border:'#DCE3EA', card2:'#F5F7FA',
  text:'#0E1720', muted:'#4D5B68', dim:'#75808B',
  green:'#0A8F58', teal:'#0D9488', amber:'#B45309', red:'#DC2626', blue:'#2563EB',
};
// eslint-disable-next-line prefer-const
const C = { ...PALETTE_DARK };

function useAppliquerTheme() {
  const mode = useThemeStore(s => s.mode);
  Object.assign(C, mode === 'light' ? PALETTE_LIGHT : PALETTE_DARK);
}

// ── Carte KPI ─────────────────────────────────────────────────────
export const Card = ({ label, value, sub, color, icon }) => {
  useAppliquerTheme();
  const couleurValeur = color || C.green;
  return (
    <div style={{ background: C.card, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: '20px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        {icon && <span style={{ fontSize: 20 }}>{icon}</span>}
        <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.5px', color: C.dim, fontWeight: 700 }}>{label}</span>
      </div>
      <div style={{ fontSize: 30, fontWeight: 900, color: couleurValeur, marginBottom: sub ? 4 : 0 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.muted }}>{sub}</div>}
    </div>
  );
};

// ── Modale ────────────────────────────────────────────────────────
export const Modal = ({ open, onClose, title, subtitle, children, width = 560 }) => {
  useAppliquerTheme();
  if (!open) return null;
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 28, width: '100%', maxWidth: width, maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,.06)', border: 'none', borderRadius: 8, width: 30, height: 30, color: C.muted, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: subtitle ? 4 : 20 }}>{title}</h2>
        {subtitle && <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>{subtitle}</p>}
        {children}
      </div>
    </div>
  );
};

// ── Input ─────────────────────────────────────────────────────────
export const Input = ({ label, required, ...props }) => {
  useAppliquerTheme();
  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>
          {label}{required && <span style={{ color: C.red, marginLeft: 2 }}>*</span>}
        </label>
      )}
      <input {...props} style={{ width: '100%', background: C.hover, border: `1.5px solid ${C.border}`, borderRadius: 9, padding: '10px 12px', color: C.text, fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', ...props.style }}
        onFocus={e => e.target.style.borderColor = C.green}
        onBlur={e => e.target.style.borderColor = C.border}
      />
    </div>
  );
};

// ── Textarea ──────────────────────────────────────────────────────
export const Textarea = ({ label, rows = 3, ...props }) => {
  useAppliquerTheme();
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>{label}</label>}
      <textarea rows={rows} {...props} style={{ width: '100%', background: C.hover, border: `1.5px solid ${C.border}`, borderRadius: 9, padding: '10px 12px', color: C.text, fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit', ...props.style }}
        onFocus={e => e.target.style.borderColor = C.green}
        onBlur={e => e.target.style.borderColor = C.border}
      />
    </div>
  );
};

// ── Select ────────────────────────────────────────────────────────
export const Select = ({ label, required, options = [], ...props }) => {
  useAppliquerTheme();
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>{label}{required && <span style={{ color: C.red, marginLeft: 2 }}>*</span>}</label>}
      <select {...props} style={{ width: '100%', background: C.hover, border: `1.5px solid ${C.border}`, borderRadius: 9, padding: '10px 12px', color: C.text, fontSize: 13, outline: 'none', fontFamily: 'inherit', ...props.style }}>
        {options.map(o => typeof o === 'string'
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>
        )}
      </select>
    </div>
  );
};

// ── Bouton ────────────────────────────────────────────────────────
export const Btn = ({ children, variant = 'primary', loading, ...props }) => {
  useAppliquerTheme();
  const styles = {
    primary: { background: C.green, color: '#fff', border: 'none' },
    teal:    { background: C.teal, color: '#fff', border: 'none' },
    amber:   { background: C.amber, color: '#fff', border: 'none' },
    danger:  { background: C.red, color: '#fff', border: 'none' },
    outline: { background: 'transparent', color: C.muted, border: `1.5px solid ${C.border}` },
    ghost:   { background: 'rgba(255,255,255,.05)', color: C.text, border: 'none' },
  };
  return (
    <button {...props} disabled={loading || props.disabled}
      style={{ borderRadius: 9, padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: (loading || props.disabled) ? 'not-allowed' : 'pointer', opacity: (loading || props.disabled) ? .65 : 1, transition: 'opacity .15s', fontFamily: 'inherit', ...styles[variant], ...props.style }}>
      {loading ? '⏳ Chargement…' : children}
    </button>
  );
};

// ── Badge ─────────────────────────────────────────────────────────
export const Badge = ({ children, color = 'green' }) => {
  useAppliquerTheme();
  const colors = {
    green:  { bg: 'rgba(10,143,88,.15)',  text: C.green },
    amber:  { bg: 'rgba(217,119,6,.15)', text: C.amber },
    red:    { bg: 'rgba(225,29,72,.15)', text: C.red },
    blue:   { bg: 'rgba(37,99,235,.15)', text: C.blue },
    teal:   { bg: 'rgba(13,148,136,.15)',text: C.teal },
    gray:   { bg: 'rgba(255,255,255,.08)',text: C.muted },
  };
  const c = colors[color] || colors.gray;
  return (
    <span style={{ background: c.bg, color: c.text, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>{children}</span>
  );
};

// ── Tableau générique ─────────────────────────────────────────────
export const Table = ({ columns, rows, emptyMessage = 'Aucune donnée' }) => {
  useAppliquerTheme();
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            {columns.map(c => (
              <th key={c.key} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: C.dim, whiteSpace: 'nowrap' }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} style={{ textAlign: 'center', padding: 32, color: C.dim }}>{emptyMessage}</td></tr>
          ) : rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${C.card2}` }}
              onMouseOver={e => e.currentTarget.style.background = C.hover}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
              {columns.map(c => (
                <td key={c.key} style={{ padding: '10px 12px', color: C.text, verticalAlign: 'middle' }}>
                  {c.render ? c.render(row[c.key], row) : row[c.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── Panel ─────────────────────────────────────────────────────────
export const Panel = ({ title, actions, children, accent }) => {
  useAppliquerTheme();
  const accents = { green: C.green, teal: C.teal, amber: C.amber, red: C.red };
  return (
    <div style={{ background: C.card, border: `1.5px solid ${accent ? accents[accent] || C.border : C.border}`, borderRadius: 14, padding: 20, marginBottom: 0 }}>
      {(title || actions) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          {title && <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>{title}</h3>}
          {actions && <div style={{ display: 'flex', gap: 8 }}>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

// ── Ligne de liste ────────────────────────────────────────────────
export const ListItem = ({ left, center, right, onClick }) => {
  useAppliquerTheme();
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: `1px solid ${C.card2}`, cursor: onClick ? 'pointer' : 'default' }}
      onMouseOver={e => onClick && (e.currentTarget.style.background = C.hover)}
      onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
      {left && <div style={{ flexShrink: 0 }}>{left}</div>}
      <div style={{ flex: 1, minWidth: 0 }}>{center}</div>
      {right && <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>{right}</div>}
    </div>
  );
};

// ── Avatar initiales ──────────────────────────────────────────────
export const Avatar = ({ text, color, size = 38 }) => {
  useAppliquerTheme();
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color || C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: Math.round(size * .37), flexShrink: 0 }}>
      {text?.slice(0, 2).toUpperCase()}
    </div>
  );
};

// ── Grid layout ───────────────────────────────────────────────────
export const Grid = ({ cols = 2, gap = 16, children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap }}>
    {children}
  </div>
);

// ── Page header ───────────────────────────────────────────────────
export const PageHeader = ({ title, subtitle, actions }) => {
  useAppliquerTheme();
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: '0 0 4px' }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>{actions}</div>}
    </div>
  );
};

// ── Section separator ─────────────────────────────────────────────
export const SectionLabel = ({ children, color, borderColor }) => {
  useAppliquerTheme();
  const couleur = color || C.muted;
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: couleur, textTransform: 'uppercase', letterSpacing: '.5px', padding: '8px 0', borderBottom: `1.5px solid ${borderColor || couleur}`, marginBottom: 12 }}>
      {children}
    </div>
  );
};

// ── Loader ────────────────────────────────────────────────────────
export const Loader = ({ text = 'Chargement…' }) => {
  useAppliquerTheme();
  return (
    <div style={{ textAlign: 'center', padding: 60, color: C.dim }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
      <div>{text}</div>
    </div>
  );
};

// ── Empty state ───────────────────────────────────────────────────
export const Empty = ({ icon = '📭', title, subtitle }) => {
  useAppliquerTheme();
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px', color: C.dim }}>
      <div style={{ fontSize: 40, marginBottom: 10 }}>{icon}</div>
      {title && <div style={{ fontSize: 15, fontWeight: 700, color: C.muted, marginBottom: 4 }}>{title}</div>}
      {subtitle && <div style={{ fontSize: 13 }}>{subtitle}</div>}
    </div>
  );
};

// ── Barre de progression ──────────────────────────────────────────
export const ProgressBar = ({ value, max = 100, color }) => {
  useAppliquerTheme();
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div style={{ background: C.hover, borderRadius: 4, height: 6, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color || C.green, borderRadius: 4, transition: 'width .3s' }} />
    </div>
  );
};
