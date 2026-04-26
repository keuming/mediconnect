import axios from 'axios';

// ── Résolution URL API ────────────────────────────────────────────
const getBaseURL = () => {
  const raw = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  const clean = raw.replace(/\/+$/, '');
  return clean.endsWith('/api') ? clean : clean + '/api';
};

export const BASE_URL = getBaseURL();

if (process.env.NODE_ENV === 'development') {
  console.log('[MediConnect API]', BASE_URL);
}

// ── Instance Axios ────────────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
});

// ── Intercepteur requête — JWT ────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('mc_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Intercepteur réponse ─────────────────────────────────────────
let isRedirecting = false; // Évite la boucle de redirections

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isRedirecting) {
      const currentPath = window.location.pathname;
      // Ne rediriger que si on n\'est pas déjà sur /login ou /register
      if (currentPath !== '/login' && currentPath !== '/register') {
        isRedirecting = true;
        localStorage.removeItem('mc_token');
        localStorage.removeItem('mc_user');
        window.location.href = '/login';
        setTimeout(() => { isRedirecting = false; }, 2000);
      }
    }
    return Promise.reject(error);
  }
);

// ════════════════════════════════════════════════════════════════════
//  AUTH
// ════════════════════════════════════════════════════════════════════
export const authAPI = {
  login:    (d) => api.post('/auth/login', d),
  register: (d) => api.post('/auth/register', d),
  me:       ()  => api.get('/auth/me'),
  password: (d) => api.put('/auth/password', d),
};

// ════════════════════════════════════════════════════════════════════
//  CLINIQUE
// ════════════════════════════════════════════════════════════════════
export const cliniqueAPI = {
  moi:           ()      => api.get('/cliniques/moi'),
  stats:         ()      => api.get('/cliniques/stats'),
  medecins:      ()      => api.get('/medecins'),
  addMedecin:    (d)     => api.post('/medecins', d),
  updateMedecin: (id, d) => api.put(`/medecins/${id}`, d),
  deleteMedecin: (id)    => api.delete(`/medecins/${id}`),
  rdvs:          (p)     => api.get('/rendez-vous', { params: p }),
  addRdv:        (d)     => api.post('/rendez-vous', d),
  updateRdv:     (id, d) => api.put(`/rendez-vous/${id}`, d),
  deleteRdv:     (id)    => api.delete(`/rendez-vous/${id}`),
  patients:      ()      => api.get('/patients'),
  addPatient:    (d)     => api.post('/patients', d),
  deletePatient: (id)    => api.delete(`/patients/${id}`),
  stock:         ()      => api.get('/stock/clinique'),
  addStock:      (d)     => api.post('/stock/clinique', d),
  updateStock:   (id, d) => api.put(`/stock/clinique/${id}`, d),
  deleteStock:   (id)    => api.delete(`/stock/clinique/${id}`),
  factures:      ()      => api.get('/factures'),
  addFacture:    (d)     => api.post('/factures', d),
  updateFacture: (id, d) => api.put(`/factures/${id}`, d),
  deleteFacture: (id)    => api.delete(`/factures/${id}`),
  dossiers:      ()      => api.get('/assurances/dossiers'),
  addDossier:    (d)     => api.post('/assurances/dossiers', d),
  updateDossier: (id, d) => api.put(`/assurances/dossiers/${id}`, d),
  deleteDossier: (id)    => api.delete(`/assurances/dossiers/${id}`),
};

// ════════════════════════════════════════════════════════════════════
//  CONSULTATIONS
// ════════════════════════════════════════════════════════════════════
export const consultationAPI = {
  liste:     ()     => api.get('/consultations'),
  parCode:   (code) => api.get(`/consultations/par-code/${code}`),
  creer:     (d)    => api.post('/consultations', d),
  finaliser: (id)   => api.put(`/consultations/${id}/finaliser`),
  supprimer: (id)   => api.delete(`/consultations/${id}`),
};

// ════════════════════════════════════════════════════════════════════
//  CAISSE
// ════════════════════════════════════════════════════════════════════
export const caisseAPI = {
  active:    ()  => api.get('/caisse/active'),
  ouvrir:    (d) => api.post('/caisse/ouvrir', d),
  encaisser: (d) => api.post('/caisse/encaisser', d),
  decaisser: (d) => api.post('/caisse/decaisser', d),
  cloturer:  ()  => api.post('/caisse/cloturer'),
};

// ════════════════════════════════════════════════════════════════════
//  PHARMACIE
// ════════════════════════════════════════════════════════════════════
export const pharmacieAPI = {
  ordonnances:    ()      => api.get('/ordonnances'),
  commandes:      ()      => api.get('/commandes'),
  stock:          ()      => api.get('/stock/pharmacie'),
  addStock:       (d)     => api.post('/stock/pharmacie', d),
  updateStock:    (id, d) => api.put(`/stock/pharmacie/${id}`, d),
  deleteStock:    (id)    => api.delete(`/stock/pharmacie/${id}`),
  updateCommande: (id, d) => api.put(`/commandes/${id}`, d),
};

// ════════════════════════════════════════════════════════════════════
//  PATIENT
// ════════════════════════════════════════════════════════════════════
export const patientAPI = {
  profil:        () => api.get('/patients/moi'),
  rdvs:          () => api.get('/rendez-vous'),
  ordonnances:   () => api.get('/ordonnances/mes-ordonnances'),
  commandes:     () => api.get('/commandes/mes-commandes'),
  consultations: () => api.get('/consultations'),
  assurance:     () => api.get('/assurances/mon-assurance'),
};

// ════════════════════════════════════════════════════════════════════
//  NOTIFICATIONS
// ════════════════════════════════════════════════════════════════════
export const notifAPI = {
  liste:    ()    => api.get('/notifications'),
  lire:     (id)  => api.put(`/notifications/${id}/lire`),
  lireTout: ()    => api.put('/notifications/lire-tout'),
};

export default api;
