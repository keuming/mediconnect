import axios from 'axios';

// ─── Base URL ─────────────────────────────────────────────────────
const BASE_URL =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://mediconnect-fed6.vercel.app');

// ─── Instance Axios ───────────────────────────────────────────────
const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Intercepteur requête — injection du token ────────────────────
api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('mc_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch (e) {
    console.error('Erreur token:', e);
  }
  return config;
});

// ─── Intercepteur réponse — gestion 401 ──────────────────────────
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('mc_token');
      localStorage.removeItem('mc_user');
      if (!window.location.pathname.includes('/login')) {
        window.location.replace('/login?expired=true');
      }
    }
    return Promise.reject(error);
  }
);

// ════════════════════════════════════════════════════════════════════
//  AUTH
// ════════════════════════════════════════════════════════════════════
export const authAPI = {
  login:    (data)   => api.post('/auth/login', data),
  register: (data)   => api.post('/auth/register', data),
  me:       ()       => api.get('/auth/me'),
};

// ════════════════════════════════════════════════════════════════════
//  UTILISATEURS
// ════════════════════════════════════════════════════════════════════
export const utilisateurAPI = {
  getAll:    ()     => api.get('/utilisateurs'),
  updateMe:  (data) => api.put('/utilisateurs/me', data),
};

// ════════════════════════════════════════════════════════════════════
//  CLINIQUES
// ════════════════════════════════════════════════════════════════════
export const cliniqueAPI = {
  getAll:      ()     => api.get('/cliniques'),
  getProfil:   ()     => api.get('/cliniques/mon-profil'),
  updateProfil:(data) => api.put('/cliniques/mon-profil', data),
  getStats:    ()     => api.get('/cliniques/stats'),
};

// ════════════════════════════════════════════════════════════════════
//  MÉDECINS (clinique)
// ════════════════════════════════════════════════════════════════════
export const medecinAPI = {
  getAll:   (params) => api.get('/medecins', { params }),
  create:   (data)   => api.post('/medecins', data),
  update:   (id, data) => api.put(`/medecins/${id}`, data),
  delete:   (id)     => api.delete(`/medecins/${id}`),
  getPublic:(params) => api.get('/public/medecins', { params }),
};

// ════════════════════════════════════════════════════════════════════
//  MÉDECINS INDÉPENDANTS
// ════════════════════════════════════════════════════════════════════
export const medecinIndepAPI = {
  getAll:      (params) => api.get('/medecins-independants', { params }),
  getProfil:   ()       => api.get('/medecins-independants/mon-profil'),
  updateProfil:(data)   => api.put('/medecins-independants/mon-profil', data),
  getPublic:   (params) => api.get('/public/medecins-independants', { params }),
};

// ════════════════════════════════════════════════════════════════════
//  PATIENTS
// ════════════════════════════════════════════════════════════════════
export const patientAPI = {
  getAll:    ()         => api.get('/patients'),
  getProfil: ()         => api.get('/patients/mon-profil'),
  getById:   (id)       => api.get(`/patients/${id}`),
  create:    (data)     => api.post('/patients', data),
  update:    (id, data) => api.put(`/patients/${id}`, data),
};

// ════════════════════════════════════════════════════════════════════
//  RENDEZ-VOUS
// ════════════════════════════════════════════════════════════════════
export const rdvAPI = {
  getAll:   (params)    => api.get('/rendez-vous', { params }),
  create:   (data)      => api.post('/rendez-vous', data),
  update:   (id, data)  => api.put(`/rendez-vous/${id}`, data),
  delete:   (id)        => api.delete(`/rendez-vous/${id}`),
  createPublic: (data)  => api.post('/public/rdv', data),
};

// ════════════════════════════════════════════════════════════════════
//  CONSULTATIONS
// ════════════════════════════════════════════════════════════════════
export const consultationAPI = {
  getAll:     (params) => api.get('/consultations', { params }),
  create:     (data)   => api.post('/consultations', data),
  finaliser:  (id)     => api.put(`/consultations/${id}/finaliser`),
};

// ════════════════════════════════════════════════════════════════════
//  ORDONNANCES
// ════════════════════════════════════════════════════════════════════
export const ordonnanceAPI = {
  getAll:  (params) => api.get('/ordonnances', { params }),
  create:  (data)   => api.post('/ordonnances', data),
};

// ════════════════════════════════════════════════════════════════════
//  PRESCRIPTIONS
// ════════════════════════════════════════════════════════════════════
export const prescriptionAPI = {
  getAll:  (params) => api.get('/prescriptions', { params }),
  create:  (data)   => api.post('/prescriptions', data),
};

// ════════════════════════════════════════════════════════════════════
//  STOCK
// ════════════════════════════════════════════════════════════════════
export const stockAPI = {
  getAll:  ()           => api.get('/stock'),
  create:  (data)       => api.post('/stock', data),
  update:  (id, data)   => api.put(`/stock/${id}`, data),
  delete:  (id)         => api.delete(`/stock/${id}`),
};

// ════════════════════════════════════════════════════════════════════
//  FACTURES
// ════════════════════════════════════════════════════════════════════
export const factureAPI = {
  getAll:  ()           => api.get('/factures'),
  create:  (data)       => api.post('/factures', data),
  update:  (id, data)   => api.put(`/factures/${id}`, data),
};

// ════════════════════════════════════════════════════════════════════
//  CAISSE
// ════════════════════════════════════════════════════════════════════
export const caisseAPI = {
  get:         ()     => api.get('/caisse'),
  ouvrir:      (data) => api.post('/caisse/ouvrir', data),
  transaction: (data) => api.post('/caisse/transaction', data),
  cloturer:    (data) => api.post('/caisse/cloturer', data),
};

// ════════════════════════════════════════════════════════════════════
//  ASSURANCES
// ════════════════════════════════════════════════════════════════════
export const assuranceAPI = {
  getAll:  ()           => api.get('/assurances'),
  create:  (data)       => api.post('/assurances', data),
  update:  (id, data)   => api.put(`/assurances/${id}`, data),
};

// ════════════════════════════════════════════════════════════════════
//  COMMANDES
// ════════════════════════════════════════════════════════════════════
export const commandeAPI = {
  getAll:  ()           => api.get('/commandes'),
  create:  (data)       => api.post('/commandes', data),
  update:  (id, data)   => api.put(`/commandes/${id}`, data),
};

// ════════════════════════════════════════════════════════════════════
//  NOTIFICATIONS
// ════════════════════════════════════════════════════════════════════
export const notificationAPI = {
  getAll:   ()   => api.get('/notifications'),
  lire:     (id) => api.put(`/notifications/${id}/lire`),
  lireTout: ()   => api.put('/notifications/lire-tout'),
};

// ════════════════════════════════════════════════════════════════════
//  GÉO — Recherche par proximité
// ════════════════════════════════════════════════════════════════════
export const geoAPI = {
  cliniques:           (params) => api.get('/geo/cliniques', { params }),
  pharmacies:          (params) => api.get('/geo/pharmacies', { params }),
  laboratoires:        (params) => api.get('/geo/laboratoires', { params }),
  imageries:           (params) => api.get('/geo/imageries', { params }),
  medecinsIndependants:(params) => api.get('/geo/medecins-independants', { params }),
};

// ════════════════════════════════════════════════════════════════════
//  PUBLIC
// ════════════════════════════════════════════════════════════════════
export const publicAPI = {
  getCliniques:           ()       => api.get('/public/cliniques'),
  getMedecins:            (params) => api.get('/public/medecins', { params }),
  getMedecinsIndependants:(params) => api.get('/public/medecins-independants', { params }),
  createRdv:              (data)   => api.post('/public/rdv', data),
};

// ─── Export default ───────────────────────────────────────────────
export default api;
