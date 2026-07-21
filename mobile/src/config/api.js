import AsyncStorage from '@react-native-async-storage/async-storage';

export const BACKEND = 'https://mediconnect-backend-v2.vercel.app';

// ── Token JWT ─────────────────────────────────────────────────────
export const getToken = async () => {
  try {
    const raw = await AsyncStorage.getItem('mediconnect-auth');
    if (!raw) return null;
    const p = JSON.parse(raw);
    return p?.state?.token || p?.token || null;
  } catch { return null; }
};

// ── Appel API avec auth ──────────────────────────────────────────
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
  });
  return res.json();
};

// ══════════════════════════════════════════════════════════════════
// API PATIENT
// ══════════════════════════════════════════════════════════════════
export const PatientAPI = {
  monProfil:        ()  => apiCall('/utilisateurs/me'),
  monDossier:       ()  => apiCall('/patients/me'),
  miseAJourDossier: (id,d) => apiCall(`/patients/${id}`, { method:'PUT', body:JSON.stringify(d) }),
  mesRdvs:          ()  => apiCall('/rendez-vous'),
  prendreRdv:       (d) => apiCall('/rendez-vous', { method:'POST', body:JSON.stringify(d) }),
  annulerRdv:       (id)=> apiCall(`/rendez-vous/${id}`, { method:'PUT', body:JSON.stringify({ statut:'annule' }) }),
  mesOrdonnances:   ()  => apiCall('/ordonnances'),
  mesConsultations: ()  => apiCall('/consultations'),
  mesFactures:      ()  => apiCall('/factures/patient'),
  mesCommandes:     ()  => apiCall('/commandes'),
  passerCommande:   (d) => apiCall('/commandes', { method:'POST', body:JSON.stringify(d) }),
  annulerCommande:  (id)=> apiCall(`/commandes/${id}`, { method:'PUT', body:JSON.stringify({ statut:'annulee' }) }),
  mesBulletins:     ()  => apiCall('/bulletins'),
  cliniques:        ()  => publicFetch('/public/cliniques'),
  medecinsClinique: (cid)=> publicFetch(`/public/medecins?clinique_id=${cid}`),
  medecinsMC:       ()  => publicFetch('/public/medecins?independant=true'),
  specialites:      ()  => publicFetch('/public/specialites'),
  // MediConnect Card
  monCompteCard:    ()  => apiCall('/card/mon-compte'),
  lierCarte:        (d) => apiCall('/card/lier-carte', { method:'POST', body:JSON.stringify(d) }),
  rechargerCarte:   (d) => apiCall('/card/recharger', { method:'POST', body:JSON.stringify(d) }),
  transactionsCard: ()  => apiCall('/card/transactions'),
  contactsUrgence:  ()  => apiCall('/card/contacts-urgence'),
  ajouterContact:   (d) => apiCall('/card/contacts-urgence', { method:'POST', body:JSON.stringify(d) }),
  supprimerContact: (id)=> apiCall(`/card/contacts-urgence/${id}`, { method:'DELETE' }),
  scanQR:           (num)=> publicFetch(`/card/public/scan/${num}`),
};

// ══════════════════════════════════════════════════════════════════
// API LIVREUR
// ══════════════════════════════════════════════════════════════════
export const LivreurAPI = {
  monProfil:   ()  => apiCall('/utilisateurs/me'),
  commandes:   ()  => apiCall('/livreurs/commandes'),
  accepter:    (id,livreur_id) => apiCall(`/commandes/${id}`, { method:'PUT', body:JSON.stringify({ statut:'en_cours', livreur_id }) }),
  livrer:      (id)=> apiCall(`/commandes/${id}`, { method:'PUT', body:JSON.stringify({ statut:'livre' }) }),
  historique:  ()  => apiCall('/commandes?statut=livre'),
};

// ══════════════════════════════════════════════════════════════════
// API PHARMACIE
// ══════════════════════════════════════════════════════════════════
export const PharmacieAPI = {
  monProfil:       ()  => apiCall('/utilisateurs/me'),
  commandes:       (statut) => apiCall(`/pharmacie/commandes${statut ? '?statut='+statut : ''}`),
  validerCommande: (id)=> apiCall(`/commandes/${id}`, { method:'PUT', body:JSON.stringify({ statut:'confirmee' }) }),
  debiterPatient:  (id)=> apiCall(`/commandes/${id}`, { method:'PUT', body:JSON.stringify({ statut:'en_cours' }) }),
  annuler:         (id,motif)=> apiCall(`/commandes/${id}`, { method:'PUT', body:JSON.stringify({ statut:'annulee', notes:motif }) }),
  ordonnances:     ()  => apiCall('/ordonnances'),
  servirOrdonnance:(id)=> apiCall(`/ordonnances/${id}`, { method:'PUT', body:JSON.stringify({ statut:'terminee' }) }),
  stock:           ()  => apiCall('/stock'),
};

// ══════════════════════════════════════════════════════════════════
// API MÉDECIN CONSEIL / RÉSIDENT
// ══════════════════════════════════════════════════════════════════
export const PatientAPIv2 = {
  monProfil:        ()  => apiCall('/utilisateurs/me'),
  monDossier:       ()  => apiCall('/patients/me'),
  miseAJourDossier: (id,d) => apiCall(`/patients/${id}`, { method:'PUT', body:JSON.stringify(d) }),
  mesRdvs:          ()  => apiCall('/rendez-vous'),
  prendreRdv:       (d) => apiCall('/rendez-vous', { method:'POST', body:JSON.stringify(d) }),
  annulerRdv:       (id)=> apiCall(`/rendez-vous/${id}`, { method:'PUT', body:JSON.stringify({ statut:'annule' }) }),
  mesOrdonnances:   ()  => apiCall('/ordonnances'),
  mesConsultations: ()  => apiCall('/consultations'),
  mesFactures:      ()  => apiCall('/factures/patient'),
  mesCommandes:     ()  => apiCall('/patients/commandes'),
  passerCommande:   (d) => apiCall('/commandes', { method:'POST', body:JSON.stringify(d) }),
  annulerCommande:  (id)=> apiCall(`/commandes/${id}`, { method:'PUT', body:JSON.stringify({ statut:'annulee' }) }),
  mesBulletins:     ()  => apiCall('/bulletins'),
  cliniques:        ()  => publicFetch('/public/cliniques'),
  medecinsClinique: (cid)=> publicFetch(`/public/medecins?clinique_id=${cid}`),
  medecinsMC:       ()  => publicFetch('/public/medecins?independant=true'),
  specialites:      ()  => publicFetch('/public/specialites'),

  rechercheSpecialite: (q) => publicFetch(`/public/recherche-specialite?q=${encodeURIComponent(q)}`),

  uploaderOrdonnance: (d) => apiCall('/patients/ordonnance-upload', { method:'POST', body:JSON.stringify(d) }),
  voirFichierOrdonnance: (id) => apiCall(`/patients/ordonnance/${id}/fichier`),

  pharmaciesToutes:  (ville) => publicFetch(`/patients/pharmacies-toutes${ville ? '?ville='+encodeURIComponent(ville) : ''}`),
  commanderMedicament: (d) => apiCall('/patients/commande-medicament', { method:'POST', body:JSON.stringify(d) }),
  factureProforma:   (commandeId) => apiCall(`/patients/commande/${commandeId}/facture-proforma`),
  suiviCommande:     (commandeId) => apiCall(`/patients/commande/${commandeId}/suivi`),

  monCompteCard:    ()  => apiCall('/card/mon-compte'),
  lierCarte:        (d) => apiCall('/card/lier-carte', { method:'POST', body:JSON.stringify(d) }),
  rechargerCarte:   (d) => apiCall('/card/recharger', { method:'POST', body:JSON.stringify(d) }),
  transactionsCard: ()  => apiCall('/card/transactions'),
  contactsUrgence:  ()  => apiCall('/card/contacts-urgence'),
  ajouterContact:   (d) => apiCall('/card/contacts-urgence', { method:'POST', body:JSON.stringify(d) }),
  supprimerContact: (id)=> apiCall(`/card/contacts-urgence/${id}`, { method:'DELETE' }),
  scanQR:           (num)=> publicFetch(`/card/public/scan/${num}`),
};export const MedecinAPI = {
  monProfil:        ()  => apiCall('/utilisateurs/me'),
  stats:            ()  => apiCall('/planning/stats'),
  mesRdvs:          (date)=> apiCall(`/planning/rdvs${date ? '?date='+date : ''}`),
  disponibilites:   (mois,annee)=> apiCall(`/planning/disponibilites?mois=${mois}&annee=${annee}`),
  ajouterDispo:     (d) => apiCall('/planning/disponibilites', { method:'POST', body:JSON.stringify(d) }),
  supprimerDispo:   (id)=> apiCall(`/planning/disponibilites/${id}`, { method:'DELETE' }),
  mesPatients:      ()  => apiCall('/planning/mes-patients'),
  mesConsultations: ()  => apiCall('/consultations'),
  ajouterConsult:   (d) => apiCall('/consultations/depuis-rdv', { method:'POST', body:JSON.stringify(d) }),
  mesOrdonnances:   ()  => apiCall('/ordonnances'),
  ajouterOrdonnance:(d) => apiCall('/ordonnances', { method:'POST', body:JSON.stringify(d) }),
  mesCliniques:     ()  => apiCall('/planning/mes-cliniques'),
};
