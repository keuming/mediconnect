require('dotenv').config();
const express   = require('express');
const helmet    = require('helmet');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');
const { pool }  = require('./config/db');

const isProd = process.env.NODE_ENV === 'production';

// ─── App ──────────────────────────────────────────────────────────
const app = express();
app.set('trust proxy', 1);

// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  next();
});

app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(morgan(isProd ? 'tiny' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 50,  skip: r => r.method === 'OPTIONS' }));
app.use('/api/',     rateLimit({ windowMs: 60 * 1000,      max: 500, skip: r => r.method === 'OPTIONS' }));

// ─── Health ───────────────────────────────────────────────────────
app.get('/', (req, res) =>
  res.json({ success: true, message: 'MediConnect API v2', health: '/api/health' })
);

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      success: true, status: 'ok', db: 'connected',
      env: process.env.NODE_ENV || 'unknown',
      ts:  new Date().toISOString(),
    });
  } catch (e) {
    res.status(503).json({ success: false, db: 'error', error: e.message });
  }
});

// ─── Routes ───────────────────────────────────────────────────────
app.use('/api/auth',                  require('./routes/auth'));
app.use('/api/utilisateurs',          require('./routes/utilisateurs'));
app.use('/api/cliniques',             require('./routes/cliniques'));
app.use('/api/medecins',              require('./routes/medecins'));
app.use('/api/medecins-independants', require('./routes/medecinsIndependants'));
app.use('/api/patients',              require('./routes/patients'));
app.use('/api/rendez-vous',           require('./routes/rendezVous'));
app.use('/api/consultations',         require('./routes/consultations'));
app.use('/api/ordonnances',           require('./routes/ordonnances'));
app.use('/api/prescriptions',         require('./routes/prescriptions'));
app.use('/api/stock',                 require('./routes/stock'));
app.use('/api/factures',              require('./routes/factures'));
app.use('/api/caisse',                require('./routes/caisse'));
app.use('/api/assurances',            require('./routes/assurances'));
app.use('/api/commandes',             require('./routes/commandes'));
app.use('/api/notifications',         require('./routes/notifications'));
app.use('/api/geo',                   require('./routes/geo'));
app.use('/api/public',                require('./routes/public'));

// ─── Erreurs ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: isProd && (!err.status || err.status >= 500) ? 'Erreur interne' : err.message,
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route introuvable: ${req.method} ${req.originalUrl}` });
});

// ─── Démarrage ────────────────────────────────────────────────────
if (!process.env.VERCEL) {
  const PORT = parseInt(process.env.PORT || '5000', 10);
  app.listen(PORT, () => {
    console.log(`\n🚀 MediConnect — http://localhost:${PORT}/api/health`);
    console.log(`📁 Mode: ${isProd ? 'PRODUCTION' : 'DÉVELOPPEMENT'}\n`);
  });
}

module.exports = app;
