import axios from 'axios';

// ── Configuration Axios ───────────────────────────────────────────
// On récupère l'URL de base et on enlève le slash final s'il existe
const rawUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const CLEAN_URL = rawUrl.replace(/\/$/, ""); 

// On s'assure que l'URL se termine par /api (si ce n'est pas déjà le cas)
const BASE_URL = CLEAN_URL.endsWith('/api') ? CLEAN_URL : `${CLEAN_URL}/api`;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Debug utile pour voir l'URL finale dans la console du navigateur
if (process.env.NODE_ENV !== 'production') {
  console.log('[MediConnect] API Connectée sur :', BASE_URL);
}

// Intercepteur — ajouter le token JWT automatiquement
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mc_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercepteur — gérer les erreurs et l'expiration de session
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si 401 (Non autorisé) et qu'on n'est pas déjà sur la page login
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('mc_token');
      localStorage.removeItem('mc_user');
      window.location.href = '/login?expired=true';
    }
    return Promise.reject(error);
  }
);

// ════════════════════════════════════════════
//  SERVICES API (Exportés)
// ════════════════════════════════════════════

export const authAPI = {
  login:    (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me:       ()     => api.get('/auth/me'),
  password: (data) => api.put('/auth/password', data),
};

export const cliniqueAPI = {
  moi:            ()     => api.get('/cliniques/moi'),
  stats:          ()     => api.get('/cliniques/stats'),
  medecins:       ()     => api.get('/medecins'),
  addMedecin:     (data) => api.post('/medecins', data),
  updateMedecin:  (id,d) => api.put(`/medecins/${id}`, d),
  deleteMedecin:  (id)   => api.delete(`/medecins/${id}`),
  rdvs:           (p)    => api.get('/rendez-vous', { params: p }),
  addRdv:         (data) => api.post('/rendez-vous', data),
  updateRdv:      (id,d) => api.put(`/rendez-vous/${id}`, d),
  deleteRdv:      (id)   => api.delete(`/rendez-vous/${id}`),
  patients:       ()     => api.get('/patients'),
  addPatient:     (data) => api.post('/patients', data),
  deletePatient:  (id)   => api.delete(`/patients/${id}`),
  stock:          ()     => api.get('/stock/clinique'),
  addStock:       (data) => api.post('/stock/clinique', data),
  updateStock:    (id,d) => api.put(`/stock/clinique/${id}`, d),
  deleteStock:    (id)   => api.delete(`/stock/clinique/${id}`),
  factures:       ()     => api.get('/factures'),
  addFacture:     (data) => api.post('/factures', data),
  updateFacture:  (id,d) => api.put(`/factures/${id}`, d),
  deleteFacture:  (id)   => api.delete(`/factures/${id}`),
  dossiers:       ()     => api.get('/assurances/dossiers'),
  addDossier:     (data) => api.post('/assurances/dossiers', data),
  updateDossier:  (id,d) => api.put(`/assurances/dossiers/${id}`, d),
  deleteDossier:  (id)   => api.delete(`/assurances/dossiers/${id}`),
};

export const consultationAPI = {
  liste:         ()           => api.get('/consultations'),
  parCode:       (code)       => api.get(`/consultations/par-code/${code}`),
  creer:         (data)       => api.post('/consultations', data),
  finaliser:     (id)         => api.put(`/consultations/${id}/finaliser`),
  supprimer:     (id)         => api.delete(`/consultations/${id}`),
};

export const caisseAPI = {
  active:    ()     => api.get('/caisse/active'),
  ouvrir:    (data) => api.post('/caisse/ouvrir', data),
  encaisser: (data) => api.post('/caisse/encaisser', data),
  decaisser: (data) => api.post('/caisse/decaisser', data),
  cloturer:  ()     => api.post('/caisse/cloturer'),
};

export const pharmacieAPI = {
  ordonnances:    ()     => api.get('/ordonnances'),
  commandes:      ()     => api.get('/commandes'),
  stock:          ()     => api.get('/stock/pharmacie'),
  addStock:       (data) => api.post('/stock/pharmacie', data),
  updateStock:    (id,d) => api.put(`/stock/pharmacie/${id}`, d),
  updateCommande: (id,d) => api.put(`/commandes/${id}`, d),
};

export const patientAPI = {
  profil:        ()     => api.get('/patients/moi'),
  rdvs:          ()     => api.get('/rendez-vous/mes-rdvs'),
  ordonnances:   ()     => api.get('/ordonnances/mes-ordonnances'),
  commandes:     ()     => api.get('/commandes/mes-commandes'),
  consultations: ()     => api.get('/consultations'),
  assurance:     ()     => api.get('/assurances/mon-assurance'),
};

export const notifAPI = {
  liste:  ()   => api.get('/notifications'),
  lire:   (id) => api.put(`/notifications/${id}/lire`),
  lireTout: () => api.put('/notifications/lire-tout'),
};

export default api;