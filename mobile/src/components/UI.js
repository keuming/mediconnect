import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, TextInput,
} from 'react-native';

// ══ DESIGN TOKENS ════════════════════════════════════════════════
export const C = {
  // Couleurs primaires
  green:   '#0A8F58',
  greenD:  '#076B42',
  greenL:  '#4ade80',
  teal:    '#0D9488',
  amber:   '#D97706',
  amberL:  '#FCD34D',
  red:     '#E11D48',
  blue:    '#2563EB',
  purple:  '#7C3AED',
  purpleL: '#C4B5FD',
  // Fonds
  bg:      '#060E18',
  card:    '#0C1623',
  card2:   '#111D2B',
  hover:   '#1A2535',
  input:   '#0F1A28',
  // Textes
  text:    '#F0F6FF',
  muted:   'rgba(240,246,255,.65)',
  dim:     'rgba(240,246,255,.35)',
  // Borders
  border:  'rgba(255,255,255,.08)',
  border2: 'rgba(255,255,255,.14)',
  // Radius
  r:  12,
  rL: 18,
  rS: 8,
};

// ══ COMPOSANTS DE BASE ════════════════════════════════════════════

export const Btn = ({ label, onPress, variant = 'primary', loading, disabled, icon, style }) => {
  const variants = {
    primary: { bg: C.green, text: '#fff', border: 'transparent' },
    outline: { bg: 'transparent', text: C.muted, border: C.border2 },
    danger:  { bg: 'rgba(225,29,72,.12)', text: C.red, border: 'rgba(225,29,72,.3)' },
    amber:   { bg: C.amber, text: '#fff', border: 'transparent' },
    ghost:   { bg: 'rgba(255,255,255,.05)', text: C.muted, border: C.border },
  };
  const v = variants[variant] || variants.primary;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading || disabled}
      activeOpacity={0.75}
      style={[{
        backgroundColor: v.bg,
        borderRadius: C.r,
        paddingVertical: 13,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        borderWidth: 1,
        borderColor: v.border,
        opacity: (loading || disabled) ? 0.55 : 1,
      }, style]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.text} />
      ) : (
        <>
          {icon && <Text style={{ fontSize: 16 }}>{icon}</Text>}
          <Text style={{ color: v.text, fontWeight: '700', fontSize: 14 }}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

export const Card = ({ children, style, onPress }) => {
  const Component = onPress ? TouchableOpacity : View;
  return (
    <Component
      onPress={onPress}
      activeOpacity={0.8}
      style={[{
        backgroundColor: C.card,
        borderRadius: C.rL,
        padding: 16,
        borderWidth: 1,
        borderColor: C.border,
      }, style]}
    >
      {children}
    </Component>
  );
};

export const Badge = ({ label, color = 'green', size = 'md' }) => {
  const colors = {
    green:  { bg: 'rgba(10,143,88,.18)',  text: '#4ade80' },
    amber:  { bg: 'rgba(217,119,6,.18)',  text: '#FCD34D' },
    red:    { bg: 'rgba(225,29,72,.18)',  text: '#FDA4AF' },
    blue:   { bg: 'rgba(37,99,235,.18)', text: '#93C5FD' },
    purple: { bg: 'rgba(124,58,237,.18)',text: '#C4B5FD' },
    gray:   { bg: 'rgba(255,255,255,.08)',text: 'rgba(240,246,255,.5)' },
    teal:   { bg: 'rgba(13,148,136,.18)', text: '#5EEAD4' },
  };
  const c = colors[color] || colors.gray;
  return (
    <View style={{
      backgroundColor: c.bg,
      borderRadius: 20,
      paddingHorizontal: size === 'sm' ? 8 : 12,
      paddingVertical: size === 'sm' ? 2 : 4,
      alignSelf: 'flex-start',
    }}>
      <Text style={{ color: c.text, fontSize: size === 'sm' ? 10 : 11, fontWeight: '700' }}>
        {label}
      </Text>
    </View>
  );
};

export const Field = ({ label, value, onChange, placeholder, secure, keyboardType, multiline, rows, style }) => (
  <View style={[{ marginBottom: 14 }, style]}>
    {label && (
      <Text style={{
        fontSize: 11, fontWeight: '700', color: C.dim,
        textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
      }}>
        {label}
      </Text>
    )}
    <TextInput
      value={value || ''}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={C.dim}
      secureTextEntry={secure}
      keyboardType={keyboardType || 'default'}
      multiline={multiline}
      numberOfLines={rows}
      style={{
        backgroundColor: C.input,
        borderRadius: C.r,
        paddingHorizontal: 14,
        paddingVertical: 12,
        color: C.text,
        fontSize: 14,
        borderWidth: 1,
        borderColor: C.border,
        minHeight: multiline ? (rows || 3) * 44 : undefined,
        textAlignVertical: multiline ? 'top' : 'center',
      }}
    />
  </View>
);

export const SectionTitle = ({ title, icon, action, onAction }) => (
  <View style={{
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12, marginTop: 4,
  }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {icon && <Text style={{ fontSize: 16 }}>{icon}</Text>}
      <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>{title}</Text>
    </View>
    {action && (
      <TouchableOpacity onPress={onAction}>
        <Text style={{ fontSize: 12, color: C.green, fontWeight: '600' }}>{action}</Text>
      </TouchableOpacity>
    )}
  </View>
);

export const StatCard = ({ icon, value, label, color, style }) => (
  <View style={[{
    flex: 1,
    backgroundColor: C.card,
    borderRadius: C.r,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  }, style]}>
    <Text style={{ fontSize: 22, marginBottom: 6 }}>{icon}</Text>
    <Text style={{ fontSize: 22, fontWeight: '800', color: color || C.text, marginBottom: 2 }}>
      {value}
    </Text>
    <Text style={{ fontSize: 10, color: C.dim, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.3 }}>
      {label}
    </Text>
  </View>
);

export const Empty = ({ icon, title, subtitle }) => (
  <View style={{ alignItems: 'center', padding: 40 }}>
    <Text style={{ fontSize: 44, marginBottom: 12 }}>{icon}</Text>
    <Text style={{ fontSize: 16, fontWeight: '700', color: C.text, marginBottom: 6, textAlign: 'center' }}>{title}</Text>
    {subtitle && <Text style={{ fontSize: 13, color: C.dim, textAlign: 'center', lineHeight: 20 }}>{subtitle}</Text>}
  </View>
);

export const Loader = ({ text }) => (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
    <ActivityIndicator size="large" color={C.green} />
    {text && <Text style={{ color: C.dim, marginTop: 12, fontSize: 13 }}>{text}</Text>}
  </View>
);

export const ScreenHeader = ({ title, subtitle, onBack, rightIcon, onRight }) => (
  <View style={{
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  }}>
    {onBack && (
      <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={{ fontSize: 22, color: C.muted }}>←</Text>
      </TouchableOpacity>
    )}
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 17, fontWeight: '800', color: C.text }}>{title}</Text>
      {subtitle && <Text style={{ fontSize: 12, color: C.dim, marginTop: 1 }}>{subtitle}</Text>}
    </View>
    {rightIcon && (
      <TouchableOpacity onPress={onRight} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={{ fontSize: 22 }}>{rightIcon}</Text>
      </TouchableOpacity>
    )}
  </View>
);

// Mapping statuts commandes
export const STATUT_CMD = {
  en_attente: { label: 'En attente',    color: 'amber',  icon: '⏳' },
  confirmee:  { label: 'Confirmée',     color: 'green',  icon: '✅' },
  en_cours:   { label: 'En livraison',  color: 'purple', icon: '🛵' },
  livre:      { label: 'Livrée',        color: 'teal',   icon: '📦' },
  annulee:    { label: 'Annulée',       color: 'red',    icon: '❌' },
};

export const fmtMontant = (n) =>
  Number(n || 0).toLocaleString('fr-CI') + ' FCFA';

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('fr-CI', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const fmtHeure = (t) => t?.slice(0, 5) || '—';
