# MediConnect Mobile 📱

Application React Native (Expo) pour MediConnect.

## Profils disponibles
- **Patient** : Prendre RDV, Mes RDV, Dossier Médical
- **Médecin** : Agenda, Liste patients, Dossier patient

## Installation

```bash
cd mobile
npm install
npm start
```

Puis scanne le QR code avec l'app **Expo Go** sur ton téléphone.

## Structure
```
src/
├── context/AuthContext.jsx     # Auth + gestion profils
├── services/api.js             # Appels API backend
├── theme.js                    # Couleurs & styles globaux
├── navigation/AppNavigator.jsx # Routing selon le rôle
└── screens/
    ├── auth/                   # Login, Register
    ├── patient/                # Home, PrendreRDV, MesRDV, DossierMedical, Confirmation
    └── medecin/                # Home, Patients, DossierPatient
```

## Config API
Modifier l'URL dans `src/services/api.js` :
```js
const API_BASE_URL = 'https://mediconnect4africa.cloud/api';
```

## Accès démo
- Patient : `patient@demo.ci` / `demo123`
- Médecin : `medecin@demo.ci` / `demo123`
