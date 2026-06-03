import AsyncStorage from '@react-native-async-storage/async-storage';

export const BACKEND = 'https://mediconnect-fed6.vercel.app';

// ── Token JWT ────────────────────────────────────────────────────
export const getToken = async () => {
  try {
    const raw = await AsyncStorage.getItem('mediconnect-auth');
    if (!raw) return null;
    const p = JSON.parse(raw);
    return p?.state?.token || p?.token || null;
  } catch { return null; }
};

// ── Appel API avec auth ───────────────────────────────────────────
export const apiCall = async (path, opts = {}) => {
  const token = await getToken();
  const url = `${BACKEND}/api${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Erreur ${res.status}`);
  }
  return res.json();
};

// ── Appel public (sans auth) ─────────────────────────────────────
export const publicFetch = async (path) => {
  const res = await fetch(`${BACKEND}/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  return res.json();
};

// ══════════════════════════════════════════════════════════════════
// API PATIENT
// ══════════════════════════════════════════════════════════════════
export const PatientAPI = {
  // Dossier
  monDossier:      () => apiCall('/patients/me'),
  miseAJourDossier:(id, d) => apiCall(`/patients/${id}`, { method: 'PUT', body: JSON.stringify(d) }),

  // RDV
  mesRdvs:         () => apiCall('/rendez-vous'),
  prendreRdv:      (d) => apiCall('/rendez-vous', { method: 'POST', body: JSON.stringify(d) }),
  annulerRdv:      (id) => apiCall(`/rendez-vous/${id}`, { method: 'PUT', body: JSON.stringify({ statut: 'annule' }) }),

  // Ordonnances
  mesOrdonnances:  () => apiCall('/ordonnances'),

  // Consultations
  mesConsultations:() => apiCall('/consultations'),

  // Factures
  mesFactures:     () => apiCall('/factures/patient'),

  // Commandes médicaments
  mesCommandes:    () => apiCall('/commandes'),
  passerCommande:  (d) => apiCall('/commandes', { method: 'POST', body: JSON.stringify(d) }),
  annulerCommande: (id) => apiCall(`/commandes/${id}`, { method: 'PUT', body: JSON.stringify({ statut: 'annulee' }) }),

  // Bulletins
  mesBulletins:    () => apiCall('/bulletins'),

  // Public — cliniques & médecins
  cliniques:       () => publicFetch('/public/cliniques'),
  medecinsClinique:(cid) => publicFetch(`/public/medecins?clinique_id=${cid}`),
  medecinsMC:      () => publicFetch('/public/medecins?independant=true'),

  // Pharmacies de garde (liste des pharmacies)
  pharmaciesGarde: () => publicFetch('/public/cliniques'), // adapter quand la route dédiée existe

  // Assureurs (liste des compagnies)
  assureurs:       () => apiCall('/assurances'),
};

// ══════════════════════════════════════════════════════════════════
// API LIVREUR
// ══════════════════════════════════════════════════════════════════
export const LivreurAPI = {
  // Commandes disponibles + assignées
  commandes:       () => apiCall('/livreurs/commandes'),
  // Accepter une commande
  accepter:        (id, livreur_id) => apiCall(`/commandes/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ statut: 'en_cours', livreur_id }),
  }),
  // Confirmer livraison effectuée
  livrer:          (id) => apiCall(`/commandes/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ statut: 'livre' }),
  }),
  // Historique toutes commandes livrées
  historique:      () => apiCall('/commandes?statut=livre'),
  // Gains du mois (calculé côté front depuis l'historique)
};

// ══════════════════════════════════════════════════════════════════
// API PHARMACIE
// ══════════════════════════════════════════════════════════════════
export const PharmacieAPI = {
  // Toutes les commandes
  commandes:       (statut) => apiCall(`/pharmacie/commandes${statut ? '?statut=' + statut : ''}`),
  // Valider devis patient (confirmer la commande)
  validerCommande: (id) => apiCall(`/commandes/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ statut: 'confirmee' }),
  }),
  // Débiter patient (marquer comme payée → livraison)
  debiterPatient:  (id) => apiCall(`/commandes/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ statut: 'en_cours' }),
  }),
  // Annuler commande
  annuler:         (id, motif) => apiCall(`/commandes/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ statut: 'annulee', notes: motif }),
  }),
  // Ordonnances reçues
  ordonnances:     () => apiCall('/ordonnances'),
  servirOrdonnance:(id) => apiCall(`/ordonnances/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ statut: 'terminee' }),
  }),
  // Stock
  stock:           () => apiCall('/pharmacie/stock'),
  // Stats
  stats:           async () => {
    const cmds = await apiCall('/pharmacie/commandes');
    const data = cmds.data || [];
    return {
      en_attente: data.filter(c => c.statut === 'en_attente').length,
      confirmees: data.filter(c => c.statut === 'confirmee').length,
      en_cours:   data.filter(c => c.statut === 'en_cours').length,
      livrees:    data.filter(c => c.statut === 'livre').length,
      ca_jour:    data
        .filter(c => c.statut === 'livre' && c.updated_at?.startsWith(new Date().toISOString().split('T')[0]))
        .reduce((s, c) => s + (Number(c.frais_livraison) || 0), 0),
    };
  },
};
