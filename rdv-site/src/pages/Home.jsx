import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const API = (process.env.REACT_APP_API_URL || 'https://mediconnect-backend-v2.vercel.app').replace(/\/+$/, '') + '/api';
const GOOGLE_MAPS_KEY = 'AIzaSyAy6fm2ac6OZ35VEwfjfEf_jaOTbqz3eSI';

// 54 pays reconnus par l'Union africaine. La base de donnees ne contient
// aujourd'hui des etablissements qu'en Cote d'Ivoire -- cette liste
// prepare le terrain pour l'expansion continentale du service, sans
// attendre que chaque pays ait ses premieres cliniques enregistrees.
const PAYS = [
  { code: 'DZ', label: 'Algérie', drapeau: '🇩🇿' },
  { code: 'AO', label: 'Angola', drapeau: '🇦🇴' },
  { code: 'BJ', label: 'Bénin', drapeau: '🇧🇯' },
  { code: 'BW', label: 'Botswana', drapeau: '🇧🇼' },
  { code: 'BF', label: 'Burkina Faso', drapeau: '🇧🇫' },
  { code: 'BI', label: 'Burundi', drapeau: '🇧🇮' },
  { code: 'CM', label: 'Cameroun', drapeau: '🇨🇲' },
  { code: 'CV', label: 'Cap-Vert', drapeau: '🇨🇻' },
  { code: 'CF', label: 'République centrafricaine', drapeau: '🇨🇫' },
  { code: 'KM', label: 'Comores', drapeau: '🇰🇲' },
  { code: 'CG', label: 'Congo-Brazzaville', drapeau: '🇨🇬' },
  { code: 'CD', label: 'RD Congo', drapeau: '🇨🇩' },
  { code: 'CI', label: "Côte d'Ivoire", drapeau: '🇨🇮' },
  { code: 'DJ', label: 'Djibouti', drapeau: '🇩🇯' },
  { code: 'EG', label: 'Égypte', drapeau: '🇪🇬' },
  { code: 'ER', label: 'Érythrée', drapeau: '🇪🇷' },
  { code: 'SZ', label: 'Eswatini', drapeau: '🇸🇿' },
  { code: 'ET', label: 'Éthiopie', drapeau: '🇪🇹' },
  { code: 'GA', label: 'Gabon', drapeau: '🇬🇦' },
  { code: 'GM', label: 'Gambie', drapeau: '🇬🇲' },
  { code: 'GH', label: 'Ghana', drapeau: '🇬🇭' },
  { code: 'GN', label: 'Guinée', drapeau: '🇬🇳' },
  { code: 'GW', label: 'Guinée-Bissau', drapeau: '🇬🇼' },
  { code: 'GQ', label: 'Guinée équatoriale', drapeau: '🇬🇶' },
  { code: 'KE', label: 'Kenya', drapeau: '🇰🇪' },
  { code: 'LS', label: 'Lesotho', drapeau: '🇱🇸' },
  { code: 'LR', label: 'Liberia', drapeau: '🇱🇷' },
  { code: 'LY', label: 'Libye', drapeau: '🇱🇾' },
  { code: 'MG', label: 'Madagascar', drapeau: '🇲🇬' },
  { code: 'MW', label: 'Malawi', drapeau: '🇲🇼' },
  { code: 'ML', label: 'Mali', drapeau: '🇲🇱' },
  { code: 'MA', label: 'Maroc', drapeau: '🇲🇦' },
  { code: 'MU', label: 'Maurice', drapeau: '🇲🇺' },
  { code: 'MR', label: 'Mauritanie', drapeau: '🇲🇷' },
  { code: 'MZ', label: 'Mozambique', drapeau: '🇲🇿' },
  { code: 'NA', label: 'Namibie', drapeau: '🇳🇦' },
  { code: 'NE', label: 'Niger', drapeau: '🇳🇪' },
  { code: 'NG', label: 'Nigéria', drapeau: '🇳🇬' },
  { code: 'UG', label: 'Ouganda', drapeau: '🇺🇬' },
  { code: 'RW', label: 'Rwanda', drapeau: '🇷🇼' },
  { code: 'ST', label: 'Sao Tomé-et-Principe', drapeau: '🇸🇹' },
  { code: 'SN', label: 'Sénégal', drapeau: '🇸🇳' },
  { code: 'SC', label: 'Seychelles', drapeau: '🇸🇨' },
  { code: 'SL', label: 'Sierra Leone', drapeau: '🇸🇱' },
  { code: 'SO', label: 'Somalie', drapeau: '🇸🇴' },
  { code: 'ZA', label: 'Afrique du Sud', drapeau: '🇿🇦' },
  { code: 'SS', label: 'Soudan du Sud', drapeau: '🇸🇸' },
  { code: 'SD', label: 'Soudan', drapeau: '🇸🇩' },
  { code: 'TZ', label: 'Tanzanie', drapeau: '🇹🇿' },
  { code: 'TD', label: 'Tchad', drapeau: '🇹🇩' },
  { code: 'TG', label: 'Togo', drapeau: '🇹🇬' },
  { code: 'TN', label: 'Tunisie', drapeau: '🇹🇳' },
  { code: 'ZM', label: 'Zambie', drapeau: '🇿🇲' },
  { code: 'ZW', label: 'Zimbabwe', drapeau: '🇿🇼' },
];

const VILLES_PAR_PAYS = {
  DZ: ['Alger', 'Oran', 'Constantine', 'Annaba', 'Blida', 'Sétif'],
  AO: ['Luanda', 'Huambo', 'Lobito', 'Benguela'],
  BJ: ['Cotonou', 'Porto-Novo', 'Parakou', 'Abomey-Calavi'],
  BW: ['Gaborone', 'Francistown', 'Molepolole'],
  BF: ['Ouagadougou', 'Bobo-Dioulasso', 'Koudougou', 'Banfora', 'Ouahigouya'],
  BI: ['Bujumbura', 'Gitega', 'Ngozi'],
  CM: ['Douala', 'Yaoundé', 'Garoua', 'Bamenda', 'Maroua'],
  CV: ['Praia', 'Mindelo'],
  CF: ['Bangui', 'Bimbo'],
  KM: ['Moroni', 'Mutsamudu'],
  CG: ['Brazzaville', 'Pointe-Noire', 'Dolisie'],
  CD: ['Kinshasa', 'Lubumbashi', 'Mbuji-Mayi', 'Kisangani', 'Goma'],
  // Les etablissements importes en masse sont enregistres par COMMUNE
  // d'Abidjan, pas par la metropole elle-meme (meme constat que le
  // filtre AGGLOMERATIONS cote backend) -- les 10 communes officielles
  // sont donc listees explicitement, en plus des autres villes du pays.
  CI: ['Abidjan', 'Cocody', 'Yopougon', 'Abobo', 'Adjamé', 'Plateau', 'Treichville', 'Marcory', 'Koumassi', 'Port-Bouët', 'Attécoubé',
       'Bouaké', 'Daloa', 'Yamoussoukro', 'San-Pédro', 'Korhogo', 'Man', 'Divo', 'Gagnoa', 'Abengourou', 'Agboville', 'Grand-Bassam', 'Soubré', 'Adzopé'],
  DJ: ['Djibouti-ville', 'Ali Sabieh'],
  EG: ['Le Caire', 'Alexandrie', 'Gizeh', 'Louxor', 'Assouan'],
  ER: ['Asmara', 'Massaoua'],
  SZ: ['Mbabane', 'Manzini'],
  ET: ['Addis-Abeba', 'Dire Dawa', 'Mekele'],
  GA: ['Libreville', 'Port-Gentil', 'Franceville'],
  GM: ['Banjul', 'Serekunda'],
  GH: ['Accra', 'Kumasi', 'Tamale', 'Sekondi-Takoradi', 'Cape Coast'],
  GN: ['Conakry', "N'Zérékoré", 'Kankan', 'Kindia'],
  GW: ['Bissau', 'Bafatá'],
  GQ: ['Malabo', 'Bata'],
  KE: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru'],
  LS: ['Maseru', 'Teyateyaneng'],
  LR: ['Monrovia', 'Gbarnga'],
  LY: ['Tripoli', 'Benghazi', 'Misrata'],
  MG: ['Antananarivo', 'Toamasina', 'Antsirabe'],
  MW: ['Lilongwe', 'Blantyre', 'Mzuzu'],
  ML: ['Bamako', 'Sikasso', 'Mopti', 'Kayes', 'Ségou'],
  MA: ['Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Tanger', 'Agadir'],
  MU: ['Port-Louis', 'Beau Bassin-Rose Hill'],
  MR: ['Nouakchott', 'Nouadhibou'],
  MZ: ['Maputo', 'Matola', 'Beira', 'Nampula'],
  NA: ['Windhoek', 'Walvis Bay'],
  NE: ['Niamey', 'Zinder', 'Maradi'],
  NG: ['Lagos', 'Abuja', 'Kano', 'Ibadan', 'Port Harcourt'],
  UG: ['Kampala', 'Gulu', 'Mbarara'],
  RW: ['Kigali', 'Butare', 'Gisenyi'],
  ST: ['São Tomé'],
  SN: ['Dakar', 'Thiès', 'Kaolack', 'Ziguinchor', 'Saint-Louis', 'Rufisque', 'Touba', 'Mbour'],
  SC: ['Victoria'],
  SL: ['Freetown', 'Bo', 'Kenema'],
  SO: ['Mogadiscio', 'Hargeisa'],
  ZA: ['Johannesburg', 'Le Cap', 'Pretoria', 'Durban', 'Port Elizabeth', 'Bloemfontein'],
  SS: ['Djouba'],
  SD: ['Khartoum', 'Omdurman', 'Port-Soudan'],
  TZ: ['Dar es Salaam', 'Dodoma', 'Mwanza', 'Arusha'],
  TD: ["N'Djaména", 'Moundou', 'Sarh'],
  TG: ['Lomé', 'Sokodé', 'Kara', 'Kpalimé'],
  TN: ['Tunis', 'Sfax', 'Sousse', 'Kairouan'],
  ZM: ['Lusaka', 'Ndola', 'Kitwe'],
  ZW: ['Harare', 'Bulawayo', 'Mutare'],
};

// Liste alignee sur les specialites reellement enregistrees en base
// (specialites_clinique), completee de quelques disciplines courantes.
const SPECIALITES = [
  'Médecine générale', 'Cardiologie', 'Pédiatrie', 'Gynécologie', 'Gynéco-obstétrique',
  'Dermatologie', 'Diabétologie', 'Gastro-entérologie', 'Hématologie', 'Néonatologie',
  'Néphrologie', 'Neurologie', 'Ophtalmologie', 'ORL', 'Orthopédie', 'Psychiatrie',
  'Radiologie', 'Rhumatologie', 'Stomatologie', 'Urologie', 'Chirurgie', 'Endocrinologie',
  'Analyses sanguines', 'Imagerie médicale',
];

const V = {
  green: '#0A8F58', teal: '#0D9488', purple: '#7C3AED', amber: '#D97706', bg: '#060C12', card: '#0E1620',
  input: '#141E2B', hover: '#1A2535', border: '#1E2F42',
  text: '#F0F4F8', muted: '#8BA0B5', dim: '#4E657A',
};

const btn = (extra = {}) => ({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: `linear-gradient(135deg,${V.green},${V.teal})`, color: '#fff', border: 'none', borderRadius: 12, padding: '14px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 6px 24px rgba(10,143,88,.35)', transition: 'all .2s', ...extra });
const inputStyle = { width: '100%', background: V.input, border: `1.5px solid ${V.border}`, borderRadius: 10, padding: '12px 14px', color: V.text, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: V.muted, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 };

// ── Menu deroulant avec recherche (meme mecanisme que la selection de
//    clinique existante a l'inscription) : on tape, une liste filtree
//    apparait en dessous, on clique pour choisir. ──────────────────────
function ComboboxRecherche({ label, valeur, onChoisir, onTexteChange, options, placeholder, disabled }) {
  const [texte, setTexte] = useState(valeur || '');
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef(null);

  useEffect(() => { setTexte(valeur || ''); }, [valeur]);

  useEffect(() => {
    const fermer = (e) => { if (ref.current && !ref.current.contains(e.target)) setOuvert(false); };
    document.addEventListener('mousedown', fermer);
    return () => document.removeEventListener('mousedown', fermer);
  }, []);

  const filtres = texte.trim().length === 0
    ? options.slice(0, 8)
    : options.filter(o => o.label.toLowerCase().includes(texte.toLowerCase())).slice(0, 8);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <label style={labelStyle}>{label}</label>
      <input
        value={texte}
        disabled={disabled}
        onChange={e => { setTexte(e.target.value); setOuvert(true); if (onTexteChange) onTexteChange(e.target.value); }}
        onFocus={() => setOuvert(true)}
        placeholder={placeholder}
        onKeyDown={e => e.key === 'Enter' && setOuvert(false)}
        style={{ ...inputStyle, opacity: disabled ? .5 : 1, cursor: disabled ? 'not-allowed' : 'text' }}
      />
      {ouvert && !disabled && filtres.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: V.card, border: `1.5px solid ${V.border}`, borderRadius: 10, overflow: 'hidden', zIndex: 20, maxHeight: 240, overflowY: 'auto', boxShadow: '0 12px 30px rgba(0,0,0,.5)' }}>
          {filtres.map(o => (
            <div key={o.value} onClick={() => { onChoisir(o.value, o.label); setTexte(o.label); setOuvert(false); }}
              style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 13, color: V.text, borderBottom: `1px solid ${V.border}` }}
              onMouseEnter={e => e.currentTarget.style.background = V.hover}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              {o.icone ? `${o.icone} ` : ''}{o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Chargement paresseux de Google Maps JS API ──────────────────────
let mapsPromise = null;
function chargerGoogleMaps() {
  if (window.google?.maps) return Promise.resolve();
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&loading=async`;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return mapsPromise;
}

function Carte({ resultats, position }) {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    let annule = false;
    chargerGoogleMaps().then(() => {
      if (annule || !ref.current) return;
      const centre = position || { lat: 5.3364, lng: -4.0267 };
      mapRef.current = new window.google.maps.Map(ref.current, {
        center: centre, zoom: position ? 13 : 11,
        styles: [{ elementType: 'geometry', stylers: [{ color: '#0E1620' }] },
                 { elementType: 'labels.text.fill', stylers: [{ color: '#8BA0B5' }] },
                 { elementType: 'labels.text.stroke', stylers: [{ color: '#060C12' }] }],
      });
      if (position) {
        new window.google.maps.Marker({
          position, map: mapRef.current, title: 'Votre position',
          icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#2563EB', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 },
        });
      }
    }).catch(() => {});
    return () => { annule = true; };
  }, [position]);

  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return;
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    const bornes = new window.google.maps.LatLngBounds();
    let auMoinsUn = false;
    resultats.forEach(r => {
      if (r.latitude == null || r.longitude == null) return;
      const pos = { lat: parseFloat(r.latitude), lng: parseFloat(r.longitude) };
      const marker = new window.google.maps.Marker({ position: pos, map: mapRef.current, title: r.nom });
      markersRef.current.push(marker);
      bornes.extend(pos);
      auMoinsUn = true;
    });
    if (position) bornes.extend(position);
    if (auMoinsUn) mapRef.current.fitBounds(bornes);
  }, [resultats, position]);

  return <div ref={ref} style={{ width: '100%', height: '100%', minHeight: 320, borderRadius: 16, overflow: 'hidden' }} />;
}

export default function Home() {
  const navigate = useNavigate();
  const [type, setType] = useState('clinique');
  const [q, setQ] = useState('');
  const [villeLabel, setVilleLabel] = useState('');
  const [pays, setPays] = useState('CI');
  const [paysLabel, setPaysLabel] = useState("Côte d'Ivoire");
  const [presDeMoi, setPresDeMoi] = useState(false);
  const [position, setPosition] = useState(null);
  const [rayon, setRayon] = useState(2);
  const [rechercheLancee, setRechercheLancee] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [resultats, setResultats] = useState([]);
  const [erreurGeo, setErreurGeo] = useState('');

  const optionsPays = PAYS.map(p => ({ value: p.code, label: p.label, icone: p.drapeau }));
  const optionsVille = (VILLES_PAR_PAYS[pays] || []).map(v => ({ value: v, label: v }));

  const lancerRecherche = useCallback(async (override = {}) => {
    setChargement(true);
    setRechercheLancee(true);
    const params = new URLSearchParams();
    params.set('type', override.type ?? type);
    const qVal = override.q ?? q;
    if (qVal) params.set('specialite', qVal);
    const villeVal = override.ville !== undefined ? override.ville : villeLabel;
    if (villeVal) params.set('ville', villeVal);
    const paysVal = override.pays ?? pays;
    if (paysVal) params.set('pays', paysVal);
    const pos = override.position !== undefined ? override.position : position;
    if (pos) {
      params.set('lat', pos.lat);
      params.set('lng', pos.lng);
      params.set('rayon_km', override.rayon ?? rayon);
    }
    try {
      const r = await fetch(`${API}/public/recherche-etablissements?${params}`);
      const d = await r.json();
      setResultats(d.success ? (d.data || []) : []);
    } catch {
      setResultats([]);
    }
    setChargement(false);
  }, [type, q, villeLabel, pays, position, rayon]);

  const activerPresDeMoi = () => {
    setErreurGeo('');
    if (!navigator.geolocation) { setErreurGeo("Géolocalisation non disponible sur cet appareil."); return; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(p);
        setPresDeMoi(true);
        lancerRecherche({ position: p });
      },
      () => setErreurGeo("Position refusée ou indisponible. Recherchez par ville à la place."),
      { timeout: 8000 }
    );
  };

  const desactiverPresDeMoi = () => {
    setPresDeMoi(false);
    setPosition(null);
    lancerRecherche({ position: null });
  };

  const choisirSpecialiteRapide = (s) => {
    setQ(s);
    lancerRecherche({ q: s });
  };

  const choisirPays = (code, label) => {
    setPays(code);
    setPaysLabel(label);
    setVilleLabel('');
    lancerRecherche({ pays: code, ville: '' });
  };

  const choisirVille = (valeur, label) => {
    setVilleLabel(label);
    lancerRecherche({ ville: label });
  };

  const allerPrendreRdv = (etab) => {
    navigate('/rdv', { state: { etablissementPreselectionne: { id: etab.id, type: etab.type, nom: etab.nom, ville: etab.ville } } });
  };

  return (
    <div style={{ background: V.bg, minHeight: '100vh', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* NAV compacte */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, padding: '0 5%', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(6,12,18,.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: `linear-gradient(135deg,${V.green},${V.teal})`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, fontWeight: 900, color: '#fff' }}>+</div>
          <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: V.text }}>Medi<span style={{ color: V.green }}>Connect</span></span>
        </div>
        <a href="https://manager.mediconnect4africa.cloud" target="_blank" rel="noreferrer" style={{ color: V.muted, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>Espace pro →</a>
      </nav>

      {/* RECHERCHE — coeur de la page */}
      <section style={{ padding: '36px 5% 20px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: 'clamp(24px,3.5vw,36px)', color: V.text, marginBottom: 6, textAlign: 'center' }}>
            Le soin qu'il vous faut, <span style={{ color: V.green, fontStyle: 'italic' }}>là où il se trouve</span>
          </h1>
          <p style={{ color: V.muted, fontSize: 14, textAlign: 'center', marginBottom: 22 }}>
            Cliniques, laboratoires et centres d'imagerie d'Afrique de l'Ouest, localisés en quelques secondes — là où l'information manquait, MediConnect répond.
          </p>

          {/* Onglets type */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
            {[
              { v: 'clinique', label: '🏥 Cliniques', couleur: V.green },
              { v: 'laboratoire', label: '🧪 Laboratoires', couleur: V.teal },
              { v: 'imagerie', label: '🩻 Imagerie', couleur: V.purple },
            ].map(t => (
              <button key={t.v} onClick={() => { setType(t.v); lancerRecherche({ type: t.v }); }}
                style={{
                  padding: '9px 18px', borderRadius: 24, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  border: `1.5px solid ${type === t.v ? t.couleur : V.border}`,
                  background: type === t.v ? `${t.couleur}22` : 'transparent',
                  color: type === t.v ? t.couleur : V.muted,
                }}>{t.label}</button>
            ))}
          </div>

          {/* Barre de recherche */}
          <div style={{ background: V.card, border: `1px solid ${V.border}`, borderRadius: 18, padding: 20, boxShadow: '0 20px 50px rgba(0,0,0,.4)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 14 }}>
              <ComboboxRecherche
                label="Nom, spécialité ou analyse" valeur={q}
                onTexteChange={setQ}
                onChoisir={(val, label) => choisirSpecialiteRapide(label)}
                options={SPECIALITES.map(s => ({ value: s, label: s }))}
                placeholder="Ex: Polyclinique du Sud, Cardiologie, NFS…"
              />

              <ComboboxRecherche
                label="Pays" valeur={paysLabel} onChoisir={choisirPays}
                options={optionsPays} placeholder="Rechercher un pays…"
              />

              <ComboboxRecherche
                label="Ville" valeur={villeLabel} onChoisir={choisirVille}
                options={optionsVille} placeholder={pays ? 'Rechercher une ville…' : 'Choisissez un pays d\'abord'}
                disabled={presDeMoi}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <button onClick={presDeMoi ? desactiverPresDeMoi : activerPresDeMoi}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  border: `1.5px solid ${presDeMoi ? V.green : V.border}`, background: presDeMoi ? 'rgba(10,143,88,.12)' : 'transparent', color: presDeMoi ? V.green : V.muted,
                }}>📍 {presDeMoi ? 'Position activée' : 'Près de moi'}</button>

              {presDeMoi && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: V.muted }}>
                  <span>Rayon : <strong style={{ color: V.text }}>{rayon} km</strong></span>
                  <input type="range" min="1" max="20" value={rayon}
                    onChange={e => { const r = Number(e.target.value); setRayon(r); lancerRecherche({ rayon: r }); }}
                    style={{ width: 100 }} />
                </div>
              )}

              <button onClick={() => lancerRecherche()} style={btn({ padding: '11px 28px', fontSize: 14, marginLeft: 'auto' })}>
                🔎 Rechercher
              </button>
            </div>
            {erreurGeo && <div style={{ fontSize: 12, color: '#E11D48', marginTop: 10 }}>{erreurGeo}</div>}
          </div>
        </div>
      </section>

      {/* RESULTATS */}
      {rechercheLancee && (
        <section style={{ padding: '20px 5% 80px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 380px', gap: 20 }}>

              {/* Liste */}
              <div>
                <div style={{ fontSize: 13, color: V.muted, marginBottom: 14 }}>
                  {chargement ? 'Recherche en cours…' : `${resultats.length} résultat${resultats.length > 1 ? 's' : ''}`}
                </div>
                {chargement ? (
                  <div style={{ textAlign: 'center', padding: 48, color: V.dim }}>⏳ Chargement…</div>
                ) : resultats.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 48, background: V.card, border: `1px solid ${V.border}`, borderRadius: 16, color: V.dim }}>
                    <div style={{ fontSize: 34, marginBottom: 10 }}>🔍</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: V.muted, marginBottom: 4 }}>Aucun résultat</div>
                    <div style={{ fontSize: 12 }}>Essayez une autre ville, ou élargissez le rayon de recherche.</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {resultats.map(r => (
                      <div key={r.type + r.id} style={{ background: V.card, border: `1px solid ${V.border}`, borderRadius: 14, padding: 16, display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: V.text }}>{r.nom}</span>
                            {r.distance_km != null && (
                              <span style={{ fontSize: 11, color: V.green, background: 'rgba(10,143,88,.12)', borderRadius: 12, padding: '2px 8px', fontWeight: 700 }}>
                                {r.distance_km.toFixed(1)} km
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: V.muted }}>{r.ville}{r.adresse ? ` — ${r.adresse}` : ''}</div>
                          {r.telephone && <div style={{ fontSize: 12, color: V.dim, marginTop: 2 }}>{r.telephone}</div>}
                          {(r.specialites?.length > 0 || r.analyses?.length > 0 || r.equipements?.length > 0) && (
                            <div style={{ fontSize: 11, color: V.dim, marginTop: 6 }}>
                              {(r.specialites || r.analyses || r.equipements || []).slice(0, 4).join(' · ')}
                            </div>
                          )}
                        </div>
                        <button onClick={() => allerPrendreRdv(r)} style={btn({ padding: '9px 18px', fontSize: 12, flexShrink: 0 })}>
                          Prendre RDV →
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Carte */}
              <div style={{ position: 'sticky', top: 80, height: 420, background: V.card, border: `1px solid ${V.border}`, borderRadius: 16, overflow: 'hidden' }}>
                <Carte resultats={resultats} position={position} />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* FOOTER minimal */}
      <footer style={{ background: 'rgba(4,8,14,.9)', borderTop: '1px solid rgba(255,255,255,.05)', padding: '32px 5%', textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: V.dim }}>© 2026 MediConnect Africa · rdv.mediconnect4africa.cloud</div>
      </footer>
    </div>
  );
}
