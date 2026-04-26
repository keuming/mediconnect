# MediConnect v2 — Guide de déploiement production

## ⚡ Configuration Vercel — Variables d'environnement

### Backend (projet: mediconnect-alpha-azure)

| Variable | Valeur |
|----------|--------|
| `DATABASE_URL` | `postgresql://neondb_owner:npg_5Dab9KjUWHhJ@ep-morning-moon-amlodrzn-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require` |
| `JWT_SECRET` | `61329af7bb435f91742b6f7728b893203be47c4845690b96ec0dc2ab1fa4d97349a1a38fcd3688065b7de684c8984804ba86d79c886eda213d6e67067f902e90` |
| `JWT_EXPIRES_IN` | `7d` |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | `https://mediconnect-m9xf.vercel.app` |
| `UPLOAD_DIR` | `/tmp/` |

> ⚠️ **IMPORTANT** : Le JWT_SECRET ci-dessus est unique et pré-généré.
> Copiez-le tel quel dans Vercel — le même secret doit être utilisé à chaque déploiement.

### Frontend (projet: mediconnect-m9xf)

| Variable | Valeur |
|----------|--------|
| `REACT_APP_API_URL` | `https://mediconnect-alpha-azure.vercel.app` |

> Le `/api` est ajouté automatiquement par le code.

---

## 🗄️ Migration base de données

À faire une seule fois sur votre machine locale avec le `.env` configuré :

```bash
cd backend
npm install
npm run migrate   # Crée les 20 tables
npm run seed      # Insère les comptes de démo (optionnel)
```

### Comptes de démo (après seed)

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Patient | patient@demo.ci | demo1234 |
| Clinique | clinique@demo.ci | demo1234 |
| Pharmacie | pharmacie@demo.ci | demo1234 |
| Livreur | livreur@demo.ci | demo1234 |
| Admin | admin@demo.ci | demo1234 |
| Assureur | assureur@demo.ci | demo1234 |

---

## 🚀 Déploiement

### Backend
```bash
cd backend
git add .
git commit -m "deploy: production config"
git push origin main
# → Vercel redéploie automatiquement
```

### Frontend
```bash
cd frontend
git add .
git commit -m "deploy: production config"
git push origin main
# → Vercel redéploie automatiquement
```

---

## 🔍 Vérification après déploiement

1. Tester le backend : `https://mediconnect-alpha-azure.vercel.app/api/health`
   - Doit retourner : `{"success":true,"status":"ok","db":"connected"}`
   
2. Tester la connexion : ouvrir `https://mediconnect-m9xf.vercel.app/login`
   - Utiliser les boutons démo ou les comptes créés via seed

---

## 🛠️ Développement local

```bash
# Terminal 1 — Backend
cd backend
cp .env.example .env.local
# Remplir les valeurs dans .env.local
npm install
npm run dev      # http://localhost:5000

# Terminal 2 — Frontend
cd frontend
# Créer .env.local avec :
# REACT_APP_API_URL=http://localhost:5000
npm install
npm start        # http://localhost:3000
```

---

## ❌ Dépannage

### "Erreur de connexion" sur le dashboard
1. Vérifiez que `JWT_SECRET` dans Vercel backend n'est pas la valeur par défaut
2. Vérifiez que `REACT_APP_API_URL` pointe vers le bon backend (sans `/api`)
3. Testez `/api/health` — si db: "error", vérifiez DATABASE_URL
4. Videz le localStorage : F12 → Application → Local Storage → Clear all

### CORS bloqué
1. Vérifiez que `FRONTEND_URL` dans les env vars backend = URL exacte du frontend
2. Redéployez le backend après tout changement d'env vars

### 404 sur les routes React (ex: /clinique)
1. Vérifiez que `frontend/vercel.json` est présent avec la règle `rewrites`
2. Redéployez le frontend

### Base de données non connectée
1. Vérifiez que `DATABASE_URL` se termine par `?sslmode=require`
2. Testez la connexion sur neon.tech → Dashboard → Query
