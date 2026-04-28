require('dotenv').config();

const express   = require('express');
const helmet    = require('helmet');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');
const path      = require('path');

if (!process.env.JWT_SECRET) {
  console.error('[WARN] JWT_SECRET manquant');
}

const isProd = process.env.NODE_ENV === 'production';
const app = express();

// ════════════════════════════════════════════════════════════════
// CORS — PREMIER MIDDLEWARE ABSOLU — avant helmet, morgan, tout
// ════════════════════════════════════════════════════════════════
app.use(function(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  // Répondre immédiatement aux preflight sans passer par les autres middlewares
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  next();
});

// ── Sécurité ──────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

// ── Logging ───────────────────────────────────────────────────────
app.use(morgan(isProd ? 'tiny' : 'dev'));

// ── Body parsing ──────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Fichiers statiques ────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Rate limiting (APRÈS le CORS) ─────────────────────────────────
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Trop de tentatives. Réessayez dans 15 minutes.' },
  skip: (req) => req.method === 'OPTIONS',
}));

app.use('/api/', rateLimit({
  windowMs: 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
}));

// ── Routes API ────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/utilisateurs',  require('./routes/utilisateurs'));
app.use('/api/cliniques',     require('./routes/cliniques'));
app.use('/api/medecins',      require('./routes/medecins'));
app.use('/api/patients',      require('./routes/patients'));
app.use('/api/rendez-vous',   require('./routes/rendezVous'));
app.use('/api/consultations', require('./routes/consultations'));
app.use('/api/ordonnances',   require('./routes/ordonnances'));
app.use('/api/pharmacies',    require('./routes/pharmacies'));
app.use('/api/commandes',     require('./routes/commandes'));
app.use('/api/assurances',    require('./routes/assurances'));
app.use('/api/factures',      require('./routes/factures'));
app.use('/api/stock',         require('./routes/stock'));
app.use('/api/caisse',        require('./routes/caisse'));
app.use('/api/livreurs',      require('./routes/livreurs'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/public',       require('./routes/public'));      // Routes publiques (site RDV)

// ── Health check ──────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    const { query } = require('./config/db');
    await query('SELECT 1');
    res.json({
      success: true, status: 'ok', db: 'connected',
      env: process.env.NODE_ENV || 'unknown',
      jwt: process.env.JWT_SECRET ? 'configured' : 'MISSING',
      ts: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({ success: false, status: 'degraded', db: 'error', error: err.message });
  }
});

app.get('/', (req, res) => {
  res.json({ success: true, message: 'MediConnect API v2', health: '/api/health' });
});

// ── Erreur globale ────────────────────────────────────────────────
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  const status = err.status || 500;
  console.error('[ERROR]', req.method, req.originalUrl, status, err.message);
  res.status(status).json({ success: false, message: isProd && status >= 500 ? 'Erreur interne' : err.message });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route introuvable: ' + req.method + ' ' + req.originalUrl });
});

// ── Démarrage local ───────────────────────────────────────────────
if (!process.env.VERCEL) {
  const PORT = parseInt(process.env.PORT || '5000', 10);
  app.listen(PORT, () => {
    console.log('\n🚀 MediConnect Backend — http://localhost:' + PORT + '/api/health');
  });
}

module.exports = app;
