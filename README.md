# MediConnect v2 — Plateforme Santé Afrique de l'Ouest

## Stack technique
- **Frontend** : React 18 + React Router v6 + Zustand + React Query + Axios
- **Backend** : Node.js + Express.js + PostgreSQL + Socket.IO (GPS temps réel)
- **Base de données** : PostgreSQL 14+ avec 20 tables relationnelles
- **Authentification** : JWT (JSON Web Tokens) + bcrypt

---

## Structure du projet

```
mediconnect/
├── backend/               # API REST Node.js/Express
│   ├── config/            # Configuration DB
│   ├── middleware/        # Auth JWT, rate limiting
│   ├── routes/            # Routes API (auth, consultations, caisse…)
│   ├── scripts/           # Migration & seed DB
│   ├── .env.example       # Variables d'environnement
│   └── server.js          # Point d'entrée
│
├── frontend/              # Application React
│   ├── src/
│   │   ├── context/       # Store Zustand (auth)
│   │   ├── services/      # API Axios (api.js)
│   │   ├── components/    # Composants réutilisables
│   │   │   └── layout/    # AppLayout (sidebar + topbar)
│   │   └── pages/         # Pages par rôle
│   │       ├── Login.jsx
│   │       ├── Register.jsx
│   │       ├── clinique/  # Dashboard + Consultation + Caisse
│   │       ├── patient/
│   │       ├── pharmacie/
│   │       ├── livreur/
│   │       ├── admin/
│   │       └── assureur/
│   └── public/
└── README.md
```

---

## Installation

### Prérequis
- Node.js 18+
- PostgreSQL 14+
- npm ou yarn

### 1. Base de données PostgreSQL

```sql
-- Dans psql ou pgAdmin :
CREATE DATABASE mediconnect_db;
CREATE USER mediconnect_user WITH PASSWORD 'votre_mdp';
GRANT ALL PRIVILEGES ON DATABASE mediconnect_db TO mediconnect_user;
```

### 2. Backend

```bash
cd backend

# Copier et configurer les variables d'environnement
cp .env.example .env
# Éditez .env avec vos paramètres DB et JWT_SECRET

# Installer les dépendances
npm install

# Créer les tables (migration)
npm run migrate

# (Optionnel) Insérer les données de démonstration
npm run seed

# Démarrer en développement
npm run dev
# → http://localhost:5000/api/health
```

### 3. Frontend

```bash
cd frontend

# Installer les dépendances
npm install

# (Optionnel) Créer .env.local pour surcharger l'URL API
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env.local

# Démarrer
npm start
# → http://localhost:3000
```

---

## Comptes de démonstration (après `npm run seed`)

| Profil    | Email                | Mot de passe |
|-----------|----------------------|--------------|
| Patient   | patient@demo.ci      | demo1234     |
| Clinique  | clinique@demo.ci     | demo1234     |
| Pharmacie | pharmacie@demo.ci    | demo1234     |
| Livreur   | livreur@demo.ci      | demo1234     |
| Admin     | admin@demo.ci        | demo1234     |
| Assureur  | assureur@demo.ci     | demo1234     |

---

## API Endpoints principaux

### Auth
| Méthode | Route               | Description       |
|---------|---------------------|-------------------|
| POST    | /api/auth/login     | Connexion         |
| POST    | /api/auth/register  | Inscription       |
| GET     | /api/auth/me        | Profil connecté   |

### Clinique
| Méthode | Route                        | Description                  |
|---------|------------------------------|------------------------------|
| GET     | /api/cliniques/stats         | KPIs du dashboard            |
| GET     | /api/consultations           | Liste des consultations       |
| POST    | /api/consultations           | Créer une consultation        |
| GET     | /api/consultations/par-code/:code | Accès par code patient  |
| PUT     | /api/consultations/:id/finaliser | Finaliser et signer       |

### Caisse
| Méthode | Route               | Description       |
|---------|---------------------|-------------------|
| GET     | /api/caisse/active  | Caisse active     |
| POST    | /api/caisse/ouvrir  | Ouvrir la caisse  |
| POST    | /api/caisse/encaisser | Encaissement    |
| POST    | /api/caisse/decaisser | Décaissement    |
| POST    | /api/caisse/cloturer | Clôturer        |

---

## Déploiement en production

### Backend (Railway / Render / VPS)
```bash
# Variables d'environnement à configurer :
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:5432/mediconnect_db
JWT_SECRET=votre_secret_tres_long
FRONTEND_URL=https://votre-frontend.vercel.app
```

### Frontend (Vercel / Netlify)
```bash
# Variable d'environnement :
REACT_APP_API_URL=https://votre-backend.railway.app/api

# Build de production :
npm run build
```

---

## Fonctionnalités implémentées

### Module Consultation médicale
- ✅ Formulaire complet (constantes vitales, examen clinique, diagnostic CIM-10)
- ✅ Prescriptions dynamiques (biologique, imagerie, fonctionnel, autre)
- ✅ Ordonnance avec médicaments + posologie + durée + renouvellements
- ✅ Accès par code secret patient (MC-XX-XXXX)
- ✅ Historique complet par patient
- ✅ Finalisation et signature électronique

### Module Caisse
- ✅ Ouverture de caisse avec solde initial et opérateur
- ✅ Encaissement (Espèces, Wave, Orange Money, Carte, Chèque…)
- ✅ Décaissement avec vérification du solde disponible
- ✅ Journal du jour en temps réel
- ✅ Répartition des paiements par mode
- ✅ Clôture avec récapitulatif et archivage
- ✅ Historique de toutes les caisses clôturées

### Infrastructure
- ✅ Authentification JWT sécurisée
- ✅ 6 rôles distincts avec accès isolés
- ✅ 20 tables PostgreSQL relationnelles
- ✅ Socket.IO pour GPS temps réel
- ✅ Rate limiting anti-abus
- ✅ CORS configuré
- ✅ Helmet (headers de sécurité)
