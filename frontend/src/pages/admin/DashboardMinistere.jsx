import React, { useState, useMemo, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

// ── Palette ───────────────────────────────────────────────────────
const C = {
  bg:'#060C12', card:'#0E1620', card2:'#111D2B', input:'#141E2B', hover:'#1A2535',
  border:'#1E2F42', text:'#F0F4F8', muted:'#8BA0B5', dim:'#4E657A',
  green:'#0A8F58', greenL:'#4ade80', teal:'#0D9488', amber:'#D97706',
  red:'#E11D48', blue:'#2563EB', purple:'#7C3AED',
};

// ── Helpers ───────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString('fr-CI');
const pct = (a, b) => b > 0 ? ((a / b) * 100).toFixed(1) + '%' : '—';

const MOIS_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

const PAYS_UEMOA = [
  { code:'CI', nom:'Côte d\'Ivoire' }, { code:'SN', nom:'Sénégal' },
  { code:'BF', nom:'Burkina Faso' },   { code:'ML', nom:'Mali' },
  { code:'TG', nom:'Togo' },           { code:'BJ', nom:'Bénin' },
  { code:'GN', nom:'Guinée' },         { code:'GW', nom:'Guinée-Bissau' },
  { code:'CM', nom:'Cameroun' },       { code:'GA', nom:'Gabon' },
  { code:'CG', nom:'Congo' },          { code:'TD', nom:'Tchad' },
  { code:'NE', nom:'Niger' },          { code:'CF', nom:'RCA' },
];

const ANNEES = Array.from({length:6}, (_, i) => new Date().getFullYear() - i);

// ── Mini composants ───────────────────────────────────────────────
const KPICard = ({ icon, value, label, sublabel, color, trend }) => (
  <div style={{
    background:C.card, border:`1px solid ${C.border}`, borderRadius:16,
    padding:'18px 20px', position:'relative', overflow:'hidden',
  }}>
    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
      <div style={{
        width:44, height:44, borderRadius:12,
        background:`${color}18`, border:`1px solid ${color}30`,
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:22,
      }}>{icon}</div>
      {trend !== undefined && (
        <div style={{
          fontSize:11, fontWeight:700, borderRadius:20, padding:'3px 10px',
          background: trend >= 0 ? 'rgba(74,222,128,.12)' : 'rgba(225,29,72,.12)',
          color: trend >= 0 ? '#4ade80' : '#FDA4AF',
        }}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </div>
      )}
    </div>
    <div style={{ fontSize:32, fontWeight:800, color, lineHeight:1, marginBottom:4 }}>{value}</div>
    <div style={{ fontSize:13, fontWeight:600, color:C.text, marginBottom:2 }}>{label}</div>
    {sublabel && <div style={{ fontSize:11, color:C.dim }}>{sublabel}</div>}
  </div>
);

const SectionHead = ({ icon, title, subtitle, actions }) => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
    <div>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
        <span style={{ fontSize:20 }}>{icon}</span>
        <span style={{ fontSize:17, fontWeight:800, color:C.text }}>{title}</span>
      </div>
      {subtitle && <div style={{ fontSize:12, color:C.dim, marginLeft:30 }}>{subtitle}</div>}
    </div>
    {actions}
  </div>
);

// Barre de progression stylisée
const BarRow = ({ label, value, max, color, rank, sublabel }) => (
  <div style={{ marginBottom:14 }}>
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:5 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        {rank && (
          <span style={{
            width:22, height:22, borderRadius:6,
            background: rank === 1 ? C.amber+'25' : rank === 2 ? '#CBD5E1'+'20' : rank === 3 ? '#92400E'+'20' : C.card2,
            color: rank === 1 ? C.amber : rank === 2 ? '#CBD5E1' : rank === 3 ? '#CA8A04' : C.dim,
            fontSize:11, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center',
            flexShrink:0,
          }}>{rank}</span>
        )}
        <span style={{ fontSize:13, fontWeight:600, color:C.text }}>{label}</span>
        {sublabel && <span style={{ fontSize:11, color:C.dim }}>— {sublabel}</span>}
      </div>
      <span style={{ fontSize:13, fontWeight:800, color }}>{fmt(value)} cas</span>
    </div>
    <div style={{ background:C.border, borderRadius:4, height:6, overflow:'hidden' }}>
      <div style={{
        height:'100%', borderRadius:4,
        width:`${max > 0 ? (value / max * 100) : 0}%`,
        background:`linear-gradient(90deg, ${color}, ${color}bb)`,
        transition:'width 1s cubic-bezier(.4,0,.2,1)',
      }}/>
    </div>
    <div style={{ fontSize:10, color:C.dim, marginTop:2 }}>
      {pct(value, max)} du total
    </div>
  </div>
);

// Mini ligne courbe SVG
const MiniCurve = ({ data, color, height = 60 }) => {
  if (!data?.length) return null;
  const maxVal = Math.max(...data.map(d => d.y), 1);
  const w = 320, h = height, pad = 4;
  const pts = data.map((d, i) => {
    const x = pad + (i / (data.length - 1 || 1)) * (w - pad*2);
    const y = h - pad - (d.y / maxVal) * (h - pad*2);
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width:'100%', height }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round"/>
      {data.map((d, i) => {
        const x = pad + (i / (data.length - 1 || 1)) * (w - pad*2);
        const y = h - pad - (d.y / maxVal) * (h - pad*2);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={3} fill={color}/>
            <text x={x} y={h} fontSize={9} fill={C.dim} textAnchor="middle">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
};

// ════════════════════════════════════════════════════════════════════
// PAGE : VUE D'ENSEMBLE
// ════════════════════════════════════════════════════════════════════
function PageOverview({ annee, pays, setAnnee, setPays }) {
  const { data: overview } = useQuery({
    queryKey: ['min-overview', annee, pays],
    queryFn:  () => api.get(`/ministere/overview?annee=${annee}&pays=${pays}`).then(r => r.data.data || {}),
  });
  const { data: epidemio } = useQuery({
    queryKey: ['min-epidemio', annee, pays],
    queryFn:  () => api.get(`/ministere/epidemio-mensuelle?annee=${annee}&pays=${pays}`).then(r => r.data.data || []),
  });
  const { data: pathologies } = useQuery({
    queryKey: ['min-top-patho', annee, pays],
    queryFn:  () => api.get(`/ministere/pathologies?annee=${annee}&pays=${pays}&top=5`).then(r => r.data.data || []),
  });
  const { data: medicaments } = useQuery({
    queryKey: ['min-top-med', annee, pays],
    queryFn:  () => api.get(`/ministere/medicaments?annee=${annee}&pays=${pays}&top=5`).then(r => r.data.data || []),
  });

  const o = overview || {};
  const ep = epidemio || [];

  // Agréger consultations par mois pour le graphique
  const consultsMois = MOIS_FR.map((lbl, i) => {
    const found = ep.find(e => e.mois === i + 1);
    return { y: +(found?.total_consultations || 0), label: lbl };
  });
  const maxConsults = Math.max(...consultsMois.map(d => d.y), 1);

  // Top pathologies uniques
  const topPatho = useMemo(() => {
    const map = {};
    (pathologies || []).forEach(p => {
      if (!p.affection) return;
      map[p.affection] = (map[p.affection] || 0) + +p.cas;
    });
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([a,c])=>({affection:a,cas:c}));
  }, [pathologies]);

  const maxPatho = topPatho[0]?.cas || 1;

  return (
    <div>
      <div style={{ marginBottom:28 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
          <span style={{ fontSize:20 }}>🏛️</span>
          <span style={{ fontSize:22, fontWeight:800, color:C.text }}>Tableau de bord — Ministère de la Santé</span>
        </div>
        <div style={{ fontSize:13, color:C.dim }}>
          Surveillance épidémiologique · Données de santé publique · UEMOA + CEMAC
        </div>
      </div>

      {/* KPI */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:28 }}>
        <KPICard icon="🏥" value={fmt(o.cliniques_actives)} label="Établissements actifs" sublabel="Cliniques & hôpitaux partenaires" color={C.green}/>
        <KPICard icon="🩺" value={fmt(o.total_consultations)} label="Consultations" sublabel={`En ${annee}`} color={C.teal}/>
        <KPICard icon="👥" value={fmt(o.patients_uniques)} label="Patients enregistrés" sublabel="Patients uniques" color={C.blue}/>
        <KPICard icon="💊" value={fmt(o.total_ordonnances)} label="Ordonnances émises" sublabel={`En ${annee}`} color={C.purple}/>
      </div>

      {/* Graphique consultations 12 mois */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:24, marginBottom:24 }}>
        <SectionHead icon="📈" title="Évolution des consultations (12 mois)" subtitle={`Données agrégées — ${PAYS_UEMOA.find(p=>p.code===pays)?.nom || 'Tous pays'} · ${annee}`}/>
        <div style={{ marginBottom:8 }}>
          <MiniCurve data={consultsMois} color={C.green} height={80}/>
        </div>
        <div style={{ display:'flex', overflowX:'auto', gap:4, paddingTop:8 }}>
          {consultsMois.map((d, i) => (
            <div key={i} style={{ flex:1, minWidth:52, textAlign:'center' }}>
              <div style={{ height:60, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
                <div style={{
                  width:'70%', borderRadius:'4px 4px 0 0',
                  height:`${maxConsults > 0 ? (d.y/maxConsults)*60 : 0}px`,
                  background: d.y === Math.max(...consultsMois.map(x=>x.y)) ? C.green : `${C.green}50`,
                  minHeight:2, transition:'height .8s cubic-bezier(.4,0,.2,1)',
                }}/>
              </div>
              <div style={{ fontSize:10, color:d.y===Math.max(...consultsMois.map(x=>x.y))?C.greenL:C.dim, marginTop:4, fontWeight:d.y===Math.max(...consultsMois.map(x=>x.y))?700:400 }}>
                {MOIS_FR[i]}
              </div>
              <div style={{ fontSize:11, color:C.text, fontWeight:600 }}>{d.y > 0 ? fmt(d.y) : '—'}</div>
            </div>
          ))}
        </div>
        {/* Mise en évidence du pic */}
        {maxConsults > 0 && (
          <div style={{ marginTop:16, padding:'10px 16px', background:'rgba(10,143,88,.08)', borderRadius:10, border:'1px solid rgba(10,143,88,.2)', fontSize:12, color:C.muted }}>
            📌 <strong style={{ color:C.greenL }}>Pic épidémique : {MOIS_FR[consultsMois.findIndex(d=>d.y===maxConsults)]}</strong>
            {' '}— {fmt(maxConsults)} consultations ce mois. Période de plus forte sollicitation des services de santé.
          </div>
        )}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        {/* Top 5 Affections */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:24 }}>
          <SectionHead icon="🔬" title="Top 5 affections" subtitle="Toutes les affections de l'année"/>
          {topPatho.length === 0
            ? <div style={{ textAlign:'center', color:C.dim, padding:'20px 0', fontSize:13 }}>Aucune donnée disponible</div>
            : topPatho.map((p, i) => (
              <BarRow key={i} label={p.affection} value={p.cas} max={maxPatho} color={[C.red, C.amber, C.purple, C.teal, C.blue][i] || C.muted} rank={i+1}/>
            ))
          }
        </div>

        {/* Top 5 Médicaments */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:24 }}>
          <SectionHead icon="💊" title="Top 5 médicaments prescrits" subtitle="Par nombre de prescriptions"/>
          {!medicaments?.length
            ? <div style={{ textAlign:'center', color:C.dim, padding:'20px 0', fontSize:13 }}>Aucune donnée disponible</div>
            : medicaments.slice(0,5).map((m, i) => (
              <BarRow key={i} label={m.medicament?.trim() || '—'} value={+m.prescriptions} max={+medicaments[0]?.prescriptions||1} color={[C.teal, C.green, C.blue, C.purple, C.amber][i] || C.muted} rank={i+1}/>
            ))
          }
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// PAGE : MORBIDITÉ — Pathologies & Affections
// ════════════════════════════════════════════════════════════════════
function PageMorbidite({ annee, pays }) {
  const [mois,     setMois]     = useState('');
  const [selected, setSelected] = useState(null); // affection sélectionnée pour la courbe

  const { data: pathologies, isLoading } = useQuery({
    queryKey: ['min-patho-detail', annee, pays, mois],
    queryFn:  () => api.get(`/ministere/pathologies?annee=${annee}&pays=${pays}${mois?'&mois='+mois:''}&top=30`).then(r => r.data.data || []),
  });

  const { data: evolution } = useQuery({
    queryKey: ['min-evolution', annee, pays, selected],
    queryFn:  () => selected
      ? api.get(`/ministere/pathologies/evolution?annee=${annee}&pays=${pays}&affection=${encodeURIComponent(selected)}`).then(r => r.data.data || [])
      : Promise.resolve([]),
    enabled: !!selected,
  });

  // Agréger par affection (somme de tous les mois)
  const byAffection = useMemo(() => {
    if (!pathologies) return [];
    const map = {};
    pathologies.forEach(p => {
      if (!p.affection || p.affection.length < 2) return;
      if (!map[p.affection]) map[p.affection] = { affection:p.affection, cas:0, cas_hommes:0, cas_femmes:0, age_moyen_sum:0, age_count:0 };
      map[p.affection].cas        += +p.cas;
      map[p.affection].cas_hommes += +(p.cas_hommes||0);
      map[p.affection].cas_femmes += +(p.cas_femmes||0);
      if (p.age_moyen) { map[p.affection].age_moyen_sum += +p.age_moyen * +p.cas; map[p.affection].age_count += +p.cas; }
    });
    return Object.values(map)
      .map(v => ({...v, age_moyen: v.age_count > 0 ? Math.round(v.age_moyen_sum / v.age_count) : null}))
      .sort((a,b) => b.cas - a.cas);
  }, [pathologies]);

  const maxCas = byAffection[0]?.cas || 1;
  const totalCas = byAffection.reduce((s, p) => s + p.cas, 0);

  const evolutionCurve = (evolution || []).map(e => ({
    y: +e.cas,
    label: MOIS_FR[+e.mois - 1] || e.mois_label,
  }));

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:20, fontWeight:800, color:C.text, marginBottom:4 }}>🔬 Morbidité — Pathologies & Affections</div>
          <div style={{ fontSize:12, color:C.dim }}>
            Affections les plus fréquentes diagnostiquées sur la plateforme MediConnect Africa
          </div>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <select value={mois} onChange={e => setMois(e.target.value)} style={{ background:C.input, border:`1px solid ${C.border}`, color:C.text, borderRadius:8, padding:'8px 12px', fontSize:13 }}>
            <option value="">Toute l'année {annee}</option>
            {MOIS_FR.map((m, i) => <option key={i} value={i+1}>{m} {annee}</option>)}
          </select>
        </div>
      </div>

      {/* KPI */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:24 }}>
        <KPICard icon="🔬" value={byAffection.length} label="Affections distinctes" sublabel="diagnostiquées" color={C.purple}/>
        <KPICard icon="📊" value={fmt(totalCas)} label="Cas total" sublabel={mois ? MOIS_FR[+mois-1] : `Année ${annee}`} color={C.red}/>
        <KPICard icon="🏆" value={byAffection[0]?.affection || '—'} label="Affection dominante" sublabel={byAffection[0] ? `${fmt(byAffection[0].cas)} cas` : ''} color={C.amber}/>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        {/* Tableau des affections */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:24, gridColumn:selected?'1':'1/3' }}>
          <SectionHead icon="📋" title={`Classement des affections${mois ? ' — ' + MOIS_FR[+mois-1] : ''}`} subtitle="Cliquez sur une affection pour voir son évolution mensuelle"/>
          {isLoading ? (
            <div style={{ textAlign:'center', color:C.dim, padding:40 }}>Chargement…</div>
          ) : byAffection.length === 0 ? (
            <div style={{ textAlign:'center', padding:40 }}>
              <div style={{ fontSize:36, marginBottom:12 }}>🔬</div>
              <div style={{ color:C.dim, fontSize:13 }}>Aucune donnée disponible.</div>
              <div style={{ color:C.dim, fontSize:12, marginTop:8 }}>Les consultations enregistrées avec un diagnostic alimenteront automatiquement ce tableau.</div>
            </div>
          ) : (
            <div>
              {byAffection.slice(0,15).map((p, i) => (
                <div
                  key={i}
                  onClick={() => setSelected(selected === p.affection ? null : p.affection)}
                  style={{
                    padding:'10px 12px', borderRadius:10, marginBottom:8, cursor:'pointer',
                    background: selected === p.affection ? 'rgba(10,143,88,.12)' : C.card2,
                    border:`1px solid ${selected===p.affection?C.green:C.border}`,
                    transition:'all .2s',
                  }}
                >
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{
                        width:24, height:24, borderRadius:6, fontSize:11, fontWeight:800,
                        background: i < 3 ? [C.amber+'20',`rgba(203,213,225,.15)`,`rgba(202,138,4,.15)`][i] : C.card,
                        color: i < 3 ? [C.amber,'#CBD5E1','#CA8A04'][i] : C.dim,
                        display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                      }}>{i+1}</span>
                      <span style={{ fontSize:14, fontWeight:700, color:selected===p.affection?C.greenL:C.text }}>{p.affection}</span>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:16, fontWeight:800, color:i===0?C.red:i<3?C.amber:C.muted }}>{fmt(p.cas)}</div>
                      <div style={{ fontSize:10, color:C.dim }}>{pct(p.cas, totalCas)}</div>
                    </div>
                  </div>
                  <div style={{ background:C.border, borderRadius:3, height:4, overflow:'hidden', marginBottom:6 }}>
                    <div style={{ height:'100%', borderRadius:3, width:`${(p.cas/maxCas)*100}%`, background:[C.red,C.amber,C.purple,C.teal,C.blue][i]||C.muted }}/>
                  </div>
                  <div style={{ display:'flex', gap:12, fontSize:11, color:C.dim }}>
                    {p.cas_hommes > 0 && <span>♂ {fmt(p.cas_hommes)}</span>}
                    {p.cas_femmes > 0 && <span>♀ {fmt(p.cas_femmes)}</span>}
                    {p.age_moyen   && <span>Âge moy. {p.age_moyen} ans</span>}
                    <span style={{ color:C.green, fontSize:10 }}>→ Voir l'évolution</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Courbe d'évolution de l'affection sélectionnée */}
        {selected && (
          <div style={{ background:C.card, border:`1px solid rgba(10,143,88,.3)`, borderRadius:16, padding:24 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:20 }}>
              <div>
                <div style={{ fontSize:16, fontWeight:800, color:C.text, marginBottom:4 }}>
                  📈 Évolution mensuelle
                </div>
                <div style={{ fontSize:13, color:C.greenL, fontWeight:600 }}>{selected}</div>
                <div style={{ fontSize:12, color:C.dim }}>Courbe de l'année {annee}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background:'none', border:'none', color:C.dim, fontSize:20, cursor:'pointer', padding:'0 4px' }}>×</button>
            </div>

            {evolutionCurve.length === 0 ? (
              <div style={{ textAlign:'center', color:C.dim, padding:'20px 0', fontSize:13 }}>Aucune donnée mensuelle disponible</div>
            ) : (
              <>
                {/* Barres mensuelles */}
                <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:100, marginBottom:12 }}>
                  {MOIS_FR.map((mLabel, mi) => {
                    const found = evolutionCurve.find((_, idx) => {
                      const ep = evolution?.[idx];
                      return ep && +ep.mois === mi + 1;
                    }) || evolutionCurve[mi];
                    const val = found?.y || 0;
                    const maxV = Math.max(...evolutionCurve.map(d=>d.y), 1);
                    const isPic = val === maxV && maxV > 0;
                    return (
                      <div key={mi} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                        {isPic && <span style={{ fontSize:9, color:C.amber, fontWeight:800 }}>PIC</span>}
                        <div style={{
                          width:'80%', borderRadius:'3px 3px 0 0', minHeight:2,
                          height:`${maxV>0?(val/maxV)*70:0}px`,
                          background: isPic ? `linear-gradient(0deg,${C.red},${C.amber})` : `${C.green}70`,
                          transition:'height 1s',
                        }}/>
                        <div style={{ fontSize:9, color:isPic?C.amberL:C.dim }}>{mLabel}</div>
                        <div style={{ fontSize:9, color:C.text, fontWeight:isPic?800:400 }}>{val || '—'}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Infos pic */}
                {evolutionCurve.some(d => d.y > 0) && (() => {
                  const maxV = Math.max(...evolutionCurve.map(d=>d.y));
                  const picIdx = evolutionCurve.findIndex(d=>d.y===maxV);
                  return (
                    <div style={{ background:'rgba(217,119,6,.1)', borderRadius:10, padding:'10px 14px', border:'1px solid rgba(217,119,6,.25)', fontSize:12, color:C.muted }}>
                      🔴 <strong style={{ color:C.amber }}>Pic épidémique : {evolutionCurve[picIdx]?.label}</strong>
                      {' '} — {fmt(maxV)} cas enregistrés. Nécessite une attention prioritaire des services de santé.
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// PAGE : MÉDICAMENTS — Marché pharmaceutique
// ════════════════════════════════════════════════════════════════════
function PageMedicaments({ annee, pays }) {
  const [mois, setMois] = useState('');

  const { data: medicaments, isLoading } = useQuery({
    queryKey: ['min-med-detail', annee, pays, mois],
    queryFn:  () => api.get(`/ministere/medicaments?annee=${annee}&pays=${pays}${mois?'&mois='+mois:''}&top=25`).then(r => r.data.data || []),
  });

  // Agréger par médicament
  const byMed = useMemo(() => {
    if (!medicaments) return [];
    const map = {};
    medicaments.forEach(m => {
      const k = (m.medicament || '').trim();
      if (!k || k.length < 2) return;
      map[k] = (map[k] || 0) + +m.prescriptions;
    });
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,20).map(([m,n])=>({medicament:m,prescriptions:n}));
  }, [medicaments]);

  const maxPresc = byMed[0]?.prescriptions || 1;
  const totalPresc = byMed.reduce((s, m) => s + m.prescriptions, 0);

  const CATEGORIES = [
    { nom:'Antipaludéens', color:C.red,    mots:['quinine','artémis','coartem','lumet','fansidar'] },
    { nom:'Antibiotiques', color:C.amber,  mots:['amoxic','amox','cipr','métronid','augmentin'] },
    { nom:'Antalgiques',   color:C.teal,   mots:['paracéta','ibuprofène','doliprane'] },
    { nom:'Antidiabétiques',color:C.blue,  mots:['metformine','insuline','gliben'] },
    { nom:'Antihypertenseurs',color:C.purple,mots:['amlodipine','lisinopril','captopril','nifédipine'] },
  ];

  const catColor = (nom) => {
    const n = nom.toLowerCase();
    return CATEGORIES.find(c => c.mots.some(m => n.includes(m)))?.color || C.muted;
  };

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontSize:20, fontWeight:800, color:C.text, marginBottom:4 }}>💊 Marché pharmaceutique</div>
          <div style={{ fontSize:12, color:C.dim }}>Médicaments les plus prescrits — données issues des ordonnances MediConnect</div>
        </div>
        <select value={mois} onChange={e => setMois(e.target.value)} style={{ background:C.input, border:`1px solid ${C.border}`, color:C.text, borderRadius:8, padding:'8px 12px', fontSize:13 }}>
          <option value="">Toute l'année {annee}</option>
          {MOIS_FR.map((m, i) => <option key={i} value={i+1}>{m} {annee}</option>)}
        </select>
      </div>

      {/* KPI */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:24 }}>
        <KPICard icon="💊" value={byMed.length} label="Médicaments distincts" sublabel="dans les ordonnances" color={C.teal}/>
        <KPICard icon="📋" value={fmt(totalPresc)} label="Prescriptions analysées" sublabel={mois ? MOIS_FR[+mois-1] : `Année ${annee}`} color={C.green}/>
        <KPICard icon="🏆" value={byMed[0]?.medicament || '—'} label="Médicament N°1" sublabel={byMed[0] ? `${fmt(byMed[0].prescriptions)} prescriptions` : ''} color={C.amber}/>
      </div>

      {/* Légende catégories */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:20 }}>
        {CATEGORIES.map(c => (
          <div key={c.nom} style={{ display:'flex', alignItems:'center', gap:6, background:C.card, borderRadius:20, padding:'4px 12px', border:`1px solid ${c.color}30` }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:c.color }}/>
            <span style={{ fontSize:11, color:C.muted }}>{c.nom}</span>
          </div>
        ))}
        <div style={{ fontSize:11, color:C.dim, alignSelf:'center' }}>Catégorisation automatique</div>
      </div>

      {/* Top 20 médicaments */}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:24 }}>
        <SectionHead icon="📊" title={`Top ${byMed.length} médicaments prescrits${mois ? ' — ' + MOIS_FR[+mois-1] : ''}`}/>
        {isLoading ? (
          <div style={{ textAlign:'center', color:C.dim, padding:40 }}>Chargement…</div>
        ) : byMed.length === 0 ? (
          <div style={{ textAlign:'center', padding:40 }}>
            <div style={{ fontSize:36, marginBottom:12 }}>💊</div>
            <div style={{ color:C.dim, fontSize:13 }}>Aucune donnée disponible pour cette période.</div>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {byMed.map((m, i) => {
              const color = catColor(m.medicament);
              return (
                <div key={i} style={{ padding:'10px 12px', background:C.card2, borderRadius:10, border:`1px solid ${C.border}` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <span style={{
                        width:20, height:20, borderRadius:4, fontSize:10, fontWeight:800,
                        background: i < 3 ? `${[C.amber,C.muted,'#CA8A04'][i]}20` : C.border,
                        color: i < 3 ? [C.amber,C.muted,'#CA8A04'][i] : C.dim,
                        display:'flex', alignItems:'center', justifyContent:'center',
                      }}>{i+1}</span>
                      <span style={{ fontSize:13, fontWeight:600, color:C.text, textTransform:'capitalize' }}>{m.medicament}</span>
                    </div>
                    <span style={{ fontSize:13, fontWeight:800, color }}>{fmt(m.prescriptions)}</span>
                  </div>
                  <div style={{ background:C.border, borderRadius:3, height:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:3, width:`${(m.prescriptions/maxPresc)*100}%`, background:color }}/>
                  </div>
                  <div style={{ fontSize:10, color:C.dim, marginTop:3 }}>
                    {pct(m.prescriptions, totalPresc)} du total
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// PAGE : DÉMOGRAPHIE & GÉOGRAPHIE
// ════════════════════════════════════════════════════════════════════
function PageDemographie({ annee, pays }) {
  const { data: demographics } = useQuery({
    queryKey: ['min-demo', annee, pays],
    queryFn:  () => api.get(`/ministere/demographics?annee=${annee}&pays=${pays}`).then(r => r.data.data || []),
  });
  const { data: geo } = useQuery({
    queryKey: ['min-geo', annee, pays],
    queryFn:  () => api.get(`/ministere/geo-morbidite?annee=${annee}&pays=${pays}`).then(r => r.data.data || []),
  });

  const demo = demographics || [];
  const maxDemo = Math.max(...demo.map(d => +d.total), 1);
  const totalDemo = demo.reduce((s, d) => s + +d.total, 0);
  const geoData = geo || [];
  const maxGeo = geoData[0]?.cas || 1;

  // Ratio hommes/femmes
  const hommes = demo.reduce((s,d)=>s+(+d.hommes||0),0);
  const femmes = demo.reduce((s,d)=>s+(+d.femmes||0),0);
  const total_hf = hommes + femmes;

  return (
    <div>
      <div style={{ fontSize:20, fontWeight:800, color:C.text, marginBottom:4 }}>👥 Démographie & Géographie</div>
      <div style={{ fontSize:12, color:C.dim, marginBottom:24 }}>Distribution des patients par âge, sexe et localisation géographique</div>

      {/* Ratio H/F */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginBottom:24 }}>
        <KPICard icon="👥" value={fmt(total_hf)} label="Patients analysés" sublabel="avec données démographiques" color={C.blue}/>
        <KPICard icon="♂️" value={total_hf > 0 ? `${((hommes/total_hf)*100).toFixed(0)}%` : '—'} label="Hommes" sublabel={`${fmt(hommes)} patients`} color={C.blue}/>
        <KPICard icon="♀️" value={total_hf > 0 ? `${((femmes/total_hf)*100).toFixed(0)}%` : '—'} label="Femmes" sublabel={`${fmt(femmes)} patientes`} color='#EC4899'/>
      </div>

      {/* Ratio H/F visuel */}
      {total_hf > 0 && (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:'14px 20px', marginBottom:20, display:'flex', alignItems:'center', gap:14 }}>
          <span style={{ fontSize:16, fontWeight:600, color:C.muted, flexShrink:0 }}>Répartition par sexe :</span>
          <div style={{ flex:1, background:C.border, borderRadius:4, height:16, overflow:'hidden', display:'flex' }}>
            <div style={{ width:`${(hommes/total_hf)*100}%`, background:C.blue, transition:'width 1s', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {hommes/total_hf > 0.1 && <span style={{ fontSize:10, color:'#fff', fontWeight:700 }}>♂</span>}
            </div>
            <div style={{ flex:1, background:'#EC4899', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {femmes/total_hf > 0.1 && <span style={{ fontSize:10, color:'#fff', fontWeight:700 }}>♀</span>}
            </div>
          </div>
          <span style={{ fontSize:12, color:C.muted, flexShrink:0 }}>
            {((hommes/total_hf)*100).toFixed(1)}% / {((femmes/total_hf)*100).toFixed(1)}%
          </span>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        {/* Pyramide des âges */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:24 }}>
          <SectionHead icon="📊" title="Distribution par tranche d'âge"/>
          {demo.length === 0 ? (
            <div style={{ textAlign:'center', color:C.dim, padding:'20px 0', fontSize:13 }}>Aucune donnée disponible</div>
          ) : (
            demo.map((d, i) => (
              <div key={i} style={{ marginBottom:14 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:C.text }}>{d.tranche_age}</span>
                  <span style={{ fontSize:13, fontWeight:800, color:C.muted }}>{fmt(d.total)}</span>
                </div>
                <div style={{ display:'flex', gap:2, height:8 }}>
                  <div style={{ width:`${(+d.hommes/maxDemo)*100}%`, background:C.blue, borderRadius:'3px 0 0 3px', minWidth:2 }}/>
                  <div style={{ width:`${(+d.femmes/maxDemo)*100}%`, background:'#EC4899', borderRadius:'0 3px 3px 0', minWidth:2 }}/>
                </div>
                <div style={{ display:'flex', gap:12, fontSize:10, color:C.dim, marginTop:3 }}>
                  <span style={{ color:C.blue }}>♂ {fmt(d.hommes)}</span>
                  <span style={{ color:'#EC4899' }}>♀ {fmt(d.femmes)}</span>
                  <span>{pct(d.total, totalDemo)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Géographie — Top villes */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:24 }}>
          <SectionHead icon="🗺️" title="Charge de morbidité par ville" subtitle="Villes avec le plus de cas diagnostiqués"/>
          {geoData.length === 0 ? (
            <div style={{ textAlign:'center', color:C.dim, padding:'20px 0', fontSize:13 }}>Aucune donnée géographique disponible</div>
          ) : (
            geoData.slice(0,10).map((g, i) => (
              <div key={i} style={{ marginBottom:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:12, fontWeight:800, color:i<3?C.amber:C.dim, width:18, textAlign:'center' }}>{i+1}</span>
                    <span style={{ fontSize:13, fontWeight:600, color:C.text }}>📍 {g.ville}</span>
                  </div>
                  <span style={{ fontSize:13, fontWeight:800, color:C.muted }}>{fmt(g.cas)}</span>
                </div>
                <div style={{ background:C.border, borderRadius:3, height:5, overflow:'hidden', marginLeft:26 }}>
                  <div style={{ height:'100%', borderRadius:3, width:`${(g.cas/maxGeo)*100}%`, background:[C.red,C.amber,C.purple,C.teal,C.blue][i]||C.muted }}/>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// SHELL : MINISTÈRE DE LA SANTÉ — Sans sidebar interne (AppLayout gère la sidebar)
// ════════════════════════════════════════════════════════════════════
export default function DashboardMinistere() {
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [pays,  setPays]  = useState('CI');

  return (
    <div style={{ background:C.bg, minHeight:'100%' }}>
      {/* Barre de filtres globaux horizontale */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        background:C.card, border:`1px solid ${C.border}`, borderRadius:14,
        padding:'12px 20px', marginBottom:24, flexWrap:'wrap', gap:12,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:16 }}>🏛️</span>
          <span style={{ fontSize:13, fontWeight:700, color:C.text }}>Surveillance épidémiologique</span>
          <span style={{ fontSize:11, color:C.dim }}>· Données UEMOA + CEMAC · OMS & DHIS2</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <label style={{ fontSize:11, color:C.dim, fontWeight:700 }}>Année</label>
            <select value={annee} onChange={e=>setAnnee(+e.target.value)}
              style={{ background:C.input, border:`1px solid ${C.border}`, color:C.text, borderRadius:8, padding:'7px 12px', fontSize:13, outline:'none', fontFamily:'inherit' }}>
              {ANNEES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <label style={{ fontSize:11, color:C.dim, fontWeight:700 }}>Pays</label>
            <select value={pays} onChange={e=>setPays(e.target.value)}
              style={{ background:C.input, border:`1px solid ${C.border}`, color:C.text, borderRadius:8, padding:'7px 12px', fontSize:13, outline:'none', fontFamily:'inherit' }}>
              <option value="all">Tous les pays</option>
              {PAYS_UEMOA.map(p => <option key={p.code} value={p.code}>{p.nom}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Routes des pages */}
      <Routes>
        <Route index             element={<PageOverview    annee={annee} pays={pays} setAnnee={setAnnee} setPays={setPays}/>}/>
        <Route path="morbidite"  element={<PageMorbidite   annee={annee} pays={pays}/>}/>
        <Route path="medicaments"element={<PageMedicaments annee={annee} pays={pays}/>}/>
        <Route path="demographie"element={<PageDemographie annee={annee} pays={pays}/>}/>
        <Route path="pathologies"element={<PageMorbidite   annee={annee} pays={pays}/>}/>
        <Route path="geo"        element={<PageDemographie annee={annee} pays={pays}/>}/>
        <Route path="demographics"element={<PageDemographie annee={annee} pays={pays}/>}/>
        <Route path="*"          element={<PageOverview    annee={annee} pays={pays} setAnnee={setAnnee} setPays={setPays}/>}/>
      </Routes>
    </div>
  );
}
