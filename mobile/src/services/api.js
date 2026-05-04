import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://mediconnect4africa.cloud/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Intercepteur pour ajouter le token automatiquement
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// AUTH
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

// PATIENT
export const patientAPI = {
  getMesRDV: () => api.get('/rdv/mes-rdv'),
  prendreRDV: (data) => api.post('/rdv/creer', data),
  annulerRDV: (id) => api.put(`/rdv/${id}/annuler`),
  getDossierMedical: () => api.get('/patient/dossier-medical'),
  getSpecialites: () => api.get('/specialites'),
  getVilles: () => api.get('/villes'),
  getMedecins: (filters) => api.get('/medecins', { params: filters }),
  getCreneaux: (medecinId, date) => api.get(`/medecins/${medecinId}/creneaux`, { params: { date } }),
};

// MEDECIN
export const medecinAPI = {
  getAgenda: (date) => api.get('/medecin/agenda', { params: { date } }),
  getPatients: () => api.get('/medecin/patients'),
  getDossierPatient: (patientId) => api.get(`/medecin/patients/${patientId}/dossier`),
  updateDossier: (patientId, data) => api.put(`/medecin/patients/${patientId}/dossier`, data),
  confirmerRDV: (rdvId) => api.put(`/medecin/rdv/${rdvId}/confirmer`),
  annulerRDV: (rdvId) => api.put(`/medecin/rdv/${rdvId}/annuler`),
};

export default api;
