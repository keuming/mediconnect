import React, { useState } from 'react';

// ── Carte KPI ─────────────────────────────────────────────────────
export const Card = ({ label, value, sub, color = '#0A8F58', icon }) => (
  <div style={{ background: '#141E2B', border: '1.5px solid #1E2F42', borderRadius: 14, padding: '20px 18px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      {icon && <span style={{ fontSize: 20 }}>{icon}</span>}
      <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.5px', color: '#4E657A', fontWeight: 700 }}>{label}</span>
    </div>
    <div style={{ fontSize: 30, fontWeight: 900, color, marginBottom: sub ? 4 : 0 }}>{value}</div>
    {sub && <div style={{ fontSize: 12, color: '#8BA0B5' }}>{sub}</div>}
  </div>
);

// ── Modale ────────────────────────────────────────────────────────
export const Modal = ({ open, onClose, title, subtitle, children, width = 560 }) => {
  if (!open) return null;
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div style={{ background: '#141E2B', border: '1px solid #1E2F42', borderRadius: 18, padding: 28, width: '100%', maxWidth: width, maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,.06)', border: 'none', borderRadius: 8, width: 30, height: 30, color: '#8BA0B5', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: '#F0F4F8', marginBottom: subtitle ? 4 : 20 }}>{title}</h2>
        {subtitle && <p style={{ fontSize: 13, color: '#8BA0B5', marginBottom: 20 }}>{subtitle}</p>}
        {children}
      </div>
    </div>
  );
};

// ── Input ─────────────────────────────────────────────────────────
export const Input = ({ label, required, ...props }) => (
  <div style={{ marginBottom: 14 }}>
    {label && (
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8BA0B5', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>
        {label}{required && <span style={{ color: '#E11D48', marginLeft: 2 }}>*</span>}
      </label>
    )}
    <input {...props} style={{ width: '100%', background: '#1A2535', border: '1.5px solid #1E2F42', borderRadius: 9, padding: '10px 12px', color: '#F0F4F8', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', ...props.style }}
      onFocus={e => e.target.style.borderColor = '#0A8F58'}
      onBlur={e => e.target.style.borderColor = '#1E2F42'}
    />
  </div>
);

// ── Textarea ──────────────────────────────────────────────────────
export const Textarea = ({ label, rows = 3, ...props }) => (
  <div style={{ marginBottom: 14 }}>
    {label && <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8BA0B5', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>{label}</label>}
    <textarea rows={rows} {...props} style={{ width: '100%', background: '#1A2535', border: '1.5px solid #1E2F42', borderRadius: 9, padding: '10px 12px', color: '#F0F4F8', fontSize: 13, outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit', ...props.style }}
      onFocus={e => e.target.style.borderColor = '#0A8F58'}
      onBlur={e => e.target.style.borderColor = '#1E2F42'}
    />
  </div>
);

// ── Select ────────────────────────────────────────────────────────
export const Select = ({ label, required, options = [], ...props }) => (
  <div style={{ marginBottom: 14 }}>
    {label && <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8BA0B5', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 }}>{label}{required && <span style={{ color: '#E11D48', marginLeft: 2 }}>*</span>}</label>}
    <select {...props} style={{ width: '100%', background: '#1A2535', border: '1.5px solid #1E2F42', borderRadius: 9, padding: '10px 12px', color: '#F0F4F8', fontSize: 13, outline: 'none', fontFamily: 'inherit', ...props.style }}>
      {options.map(o => typeof o === 'string'
        ? <option key={o} value={o}>{o}</option>
        : <option key={o.value} value={o.value}>{o.label}</option>
      )}
    </select>
  </div>
);

// ── Bouton ────────────────────────────────────────────────────────
export const Btn = ({ children, variant = 'primary', loading, ...props }) => {
  const styles = {
    primary: { background: '#0A8F58', color: '#fff', border: 'none' },
    teal:    { background: '#0D9488', color: '#fff', border: 'none' },
    amber:   { background: '#D97706', color: '#fff', border: 'none' },
    danger:  { background: '#E11D48', color: '#fff', border: 'none' },
    outline: { background: 'transparent', color: '#8BA0B5', border: '1.5px solid #1E2F42' },
    ghost:   { background: 'rgba(255,255,255,.05)', color: '#F0F4F8', border: 'none' },
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
  const colors = {
    green:  { bg: 'rgba(10,143,88,.15)',  text: '#0A8F58' },
    amber:  { bg: 'rgba(217,119,6,.15)', text: '#D97706' },
    red:    { bg: 'rgba(225,29,72,.15)', text: '#E11D48' },
    blue:   { bg: 'rgba(37,99,235,.15)', text: '#2563EB' },
    teal:   { bg: 'rgba(13,148,136,.15)',text: '#0D9488' },
    gray:   { bg: 'rgba(255,255,255,.08)',text: '#8BA0B5' },
  };
  const c = colors[color] || colors.gray;
  return (
    <span style={{ background: c.bg, color: c.text, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>{children}</span>
  );
};

// ── Tableau générique ─────────────────────────────────────────────
export const Table = ({ columns, rows, emptyMessage = 'Aucune donnée' }) => (
  <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ borderBottom: '1px solid #1E2F42' }}>
          {columns.map(c => (
            <th key={c.key} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: '#4E657A', whiteSpace: 'nowrap' }}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr><td colSpan={columns.length} style={{ textAlign: 'center', padding: 32, color: '#4E657A' }}>{emptyMessage}</td></tr>
        ) : rows.map((row, i) => (
          <tr key={i} style={{ borderBottom: '1px solid #0E1620' }}
            onMouseOver={e => e.currentTarget.style.background = '#1A2535'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
            {columns.map(c => (
              <td key={c.key} style={{ padding: '10px 12px', color: '#F0F4F8', verticalAlign: 'middle' }}>
                {c.render ? c.render(row[c.key], row) : row[c.key] ?? '—'}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ── Panel ─────────────────────────────────────────────────────────
export const Panel = ({ title, actions, children, accent }) => {
  const accents = { green: '#0A8F58', teal: '#0D9488', amber: '#D97706', red: '#E11D48' };
  return (
    <div style={{ background: '#141E2B', border: `1.5px solid ${accent ? accents[accent] || '#1E2F42' : '#1E2F42'}`, borderRadius: 14, padding: 20, marginBottom: 0 }}>
      {(title || actions) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          {title && <h3 style={{ fontSize: 14, fontWeight: 700, color: '#F0F4F8', margin: 0 }}>{title}</h3>}
          {actions && <div style={{ display: 'flex', gap: 8 }}>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

// ── Ligne de liste ────────────────────────────────────────────────
export const ListItem = ({ left, center, right, onClick }) => (
  <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #0E1620', cursor: onClick ? 'pointer' : 'default' }}
    onMouseOver={e => onClick && (e.currentTarget.style.background = '#1A2535')}
    onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
    {left && <div style={{ flexShrink: 0 }}>{left}</div>}
    <div style={{ flex: 1, minWidth: 0 }}>{center}</div>
    {right && <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>{right}</div>}
  </div>
);

// ── Avatar initiales ──────────────────────────────────────────────
export const Avatar = ({ text, color = '#0A8F58', size = 38 }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: Math.round(size * .37), flexShrink: 0 }}>
    {text?.slice(0, 2).toUpperCase()}
  </div>
);

// ── Grid layout ───────────────────────────────────────────────────
export const Grid = ({ cols = 2, gap = 16, children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap }}>
    {children}
  </div>
);

// ── Page header ───────────────────────────────────────────────────
export const PageHeader = ({ title, subtitle, actions }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#F0F4F8', margin: '0 0 4px' }}>{title}</h1>
      {subtitle && <p style={{ fontSize: 13, color: '#8BA0B5', margin: 0 }}>{subtitle}</p>}
    </div>
    {actions && <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>{actions}</div>}
  </div>
);

// ── Section separator ─────────────────────────────────────────────
export const SectionLabel = ({ children, color = '#8BA0B5', borderColor }) => (
  <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '.5px', padding: '8px 0', borderBottom: `1.5px solid ${borderColor || color}`, marginBottom: 12 }}>
    {children}
  </div>
);

// ── Loader ────────────────────────────────────────────────────────
export const Loader = ({ text = 'Chargement…' }) => (
  <div style={{ textAlign: 'center', padding: 60, color: '#4E657A' }}>
    <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
    <div>{text}</div>
  </div>
);

// ── Empty state ───────────────────────────────────────────────────
export const Empty = ({ icon = '📭', title, subtitle }) => (
  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#4E657A' }}>
    <div style={{ fontSize: 40, marginBottom: 10 }}>{icon}</div>
    {title && <div style={{ fontSize: 15, fontWeight: 700, color: '#8BA0B5', marginBottom: 4 }}>{title}</div>}
    {subtitle && <div style={{ fontSize: 13 }}>{subtitle}</div>}
  </div>
);

// ── Barre de progression ──────────────────────────────────────────
export const ProgressBar = ({ value, max = 100, color = '#0A8F58' }) => {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div style={{ background: '#1A2535', borderRadius: 4, height: 6, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width .3s' }} />
    </div>
  );
};
