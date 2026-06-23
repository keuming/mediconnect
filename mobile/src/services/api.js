import Constants from 'expo-constants';

// ─── URL de base — pointe vers le backend Vercel production ───────────────
const API_BASE_URL =
  Constants.expoConfig?.extra?.apiUrl ||
  process.env.API_URL ||
  'https://mediconnect-backend-v2.vercel.app';

export const API_URL = `${API_BASE_URL}/api`;

// ─── Helper fetch central ─────────────────────────────────────────────────
const request = async (endpoint, options = {}, token = null) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  } catch (err) {
    throw new Error('Impossible de joindre le serveur. Vérifiez votre connexion.');
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(`Réponse invalide du serveur (${response.status})`);
  }

  if (!response.ok) {
    throw new Error(data?.message || `Erreur serveur (${response.status})`);
  }

  return data;
};

// ─── AUTH ──────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  register: (userData) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),

  refreshToken: (token) =>
    request('/auth/refresh', { method: 'POST' }, token),
};

// ─── PATIENT ───────────────────────────────────────────────────────────────
export const patientAPI = {
  getProfile:  (token)        => request('/patients/profile', {}, token),
  getRDV:      (token)        => request('/patients/rdv', {}, token),
  getDossier:  (token)        => request('/patients/dossier', {}, token),
  prendreRDV:  (token, data)  => request('/rdv', { method: 'POST', body: JSON.stringify(data) }, token),
  annulerRDV:  (token, id)    => request(`/rdv/${id}/annuler`, { method: 'PUT' }, token),
};

// ─── MÉDECIN ───────────────────────────────────────────────────────────────
export const medecinAPI = {
  getAgenda:        (token)           => request('/medecins/agenda', {}, token),
  getPatients:      (token)           => request('/medecins/patients', {}, token),
  getDossierPatient:(token, id)       => request(`/medecins/patients/${id}/dossier`, {}, token),
  confirmerRDV:     (token, id)       => request(`/rdv/${id}/confirmer`, { method: 'PUT' }, token),
  annulerRDV:       (token, id, data) => request(`/rdv/${id}/annuler`, { method: 'PUT', body: JSON.stringify(data) }, token),
};

// ─── CLINIQUE ──────────────────────────────────────────────────────────────
export const cliniqueAPI = {
  getDashboard: (token)      => request('/clinique/dashboard', {}, token),
  getMedecins:  (token)      => request('/clinique/medecins', {}, token),
  getPatients:  (token)      => request('/clinique/patients', {}, token),
  getRDV:       (token)      => request('/clinique/rdv', {}, token),
};

// ─── PHARMACIE ─────────────────────────────────────────────────────────────
export const pharmacieAPI = {
  getOrdonnances: (token)       => request('/pharmacie/ordonnances', {}, token),
  validerOrdonnance:(token, id) => request(`/pharmacie/ordonnances/${id}/valider`, { method: 'PUT' }, token),
  getLivraisons:  (token)       => request('/pharmacie/livraisons', {}, token),
};

// ─── LIVREUR ───────────────────────────────────────────────────────────────
export const livreurAPI = {
  getMissions:    (token)      => request('/livreur/missions', {}, token),
  accepterMission:(token, id)  => request(`/livreur/missions/${id}/accepter`, { method: 'PUT' }, token),
  livrerMission:  (token, id)  => request(`/livreur/missions/${id}/livrer`, { method: 'PUT' }, token),
};

// ─── ASSUREUR ──────────────────────────────────────────────────────────────
export const assureurAPI = {
  getDossiers:   (token)      => request('/assureur/dossiers', {}, token),
  validerDossier:(token, id)  => request(`/assureur/dossiers/${id}/valider`, { method: 'PUT' }, token),
  rejeterDossier:(token, id, motif) => request(`/assureur/dossiers/${id}/rejeter`, { method: 'PUT', body: JSON.stringify({ motif }) }, token),
};

// ─── IMAGERIE ──────────────────────────────────────────────────────────────
export const imagerieAPI = {
  getExamens:    (token)      => request('/imagerie/examens', {}, token),
  ajouterResultat:(token, id, data) => request(`/imagerie/examens/${id}/resultat`, { method: 'POST', body: JSON.stringify(data) }, token),
};

// ─── LABORATOIRE ───────────────────────────────────────────────────────────
export const laboratoireAPI = {
  getAnalyses:   (token)      => request('/laboratoire/analyses', {}, token),
  ajouterResultat:(token, id, data) => request(`/laboratoire/analyses/${id}/resultat`, { method: 'POST', body: JSON.stringify(data) }, token),
};

// ─── OPTIQUE ───────────────────────────────────────────────────────────────
export const optiqueAPI = {
  getOrdonnances: (token)      => request('/optique/ordonnances', {}, token),
  getStock:       (token)      => request('/optique/stock', {}, token),
  getVentes:      (token)      => request('/optique/ventes', {}, token),
};

// ─── GÉOGRAPHIE ────────────────────────────────────────────────────────────
export const geoAPI = {
  getPays:   ()      => request('/geo/pays'),
  getVilles: (code)  => request(`/geo/pays/${code}/villes`),
};

// ─── SANTÉ / MINISTÈRE ─────────────────────────────────────────────────────
export const santeAPI = {
  getStats:       (token) => request('/sante/stats', {}, token),
  getAlertes:     (token) => request('/sante/alertes', {}, token),
  getEtablissements:(token)=> request('/sante/etablissements', {}, token),
};

export default request;

// ─── PROFIL PATIENT (ajouts v2) ────────────────────────────────────────────
export const profilAPI = {
  getProfil:    (token)       => request('/patients/profil', {}, token),
  updateProfil: (token, data) => request('/patients/profil', { method: 'PUT', body: JSON.stringify(data) }, token),
};

// Alias sur patientAPI pour compatibilité AccueilScreen
patientAPI.getProfil    = profilAPI.getProfil;
patientAPI.updateProfil = profilAPI.updateProfil;
