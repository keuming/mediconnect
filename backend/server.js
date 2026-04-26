require('dotenv').config();

const express   = require('express');
const helmet    = require('helmet');
const morgan    = require('morgan');
const http      = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
const path      = require('path');

// ── Validation JWT_SECRET ─────────────────────────────────────────
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET manquant — ajoutez-le dans les variables Vercel');
  process.exit(1);
}
if (process.env.JWT_SECRET.includes('votre_secret')) {
  console.error('❌ JWT_SECRET contient la valeur par défaut — changez-la !');
  process.exit(1);
}

const isProd = process.env.NODE_ENV === 'production';
const app    = express();
const server = http.createServer(app);

// ── Socket.IO ─────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET','POST'], credentials: true },
  transports: ['polling', 'websocket'],
  allowEIO3: true,
});

// ── Sécurité ──────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

// ── CORS — doit être EN PREMIER, avant tout ───────────────────────
app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin',      origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods',     'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers',     'Origin,Content-Type,Accept,Authorization,X-Requested-With');
  res.setHeader('Access-Control-Max-Age',           '86400');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

// ── Logging ───────────────────────────────────────────────────────
app.use(morgan(isProd ? 'tiny' : 'dev'));

// ── Body parsing ──────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Uploads statiques (tmp sur Vercel) ────────────────────────────
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadDir));

// ── Rate limiting ─────────────────────────────────────────────────
const limiterAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 30 : 500,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Trop de tentatives. Réessayez dans 15 minutes.' },
  skip: (req) => !isProd, // Pas de limite en dev
});
const limiterApi = rateLimit({
  windowMs: 60 * 1000,
  max: isProd ? 500 : 5000,
  standardHeaders: true, legacyHeaders: false,
});

app.use('/api/auth', limiterAuth);
app.use('/api/',     limiterApi);

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

// ── Health check ──────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    const { query } = require('./config/db');
    await query('SELECT 1');
    res.json({ success: true, status: 'ok', db: 'connected', env: process.env.NODE_ENV, ts: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ success: false, status: 'degraded', db: 'error', error: err.message });
  }
});

app.get('/', (req, res) => res.json({ success: true, message: 'MediConnect API v2', health: '/api/health' }));

// ── Socket.IO GPS ─────────────────────────────────────────────────
const livreurPositions = {};
io.on('connection', (socket) => {
  socket.on('livreur:position', (data) => {
    if (!data?.livreur_id) return;
    livreurPositions[data.livreur_id] = { ...data, ts: Date.now() };
    io.emit('livreur:positions', Object.values(livreurPositions));
  });
  socket.on('join:clinique', (id) => id && socket.join('clinique:' + id));
  socket.on('join:patient',  (id) => id && socket.join('patient:'  + id));
  socket.on('notification:send', (data) => {
    if (data?.patient_id) io.to('patient:' + data.patient_id).emit('notification:new', data);
  });
});

// ── Erreur globale ────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  console.error('[SERVER ERROR]', status, err.message);
  res.status(status).json({
    success: false,
    message: isProd && status >= 500 ? 'Erreur interne du serveur' : (err.message || 'Erreur interne'),
  });
});

// ── 404 ───────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route introuvable: ${req.method} ${req.originalUrl}` });
});

// ── Démarrage local (Vercel démarre lui-même) ─────────────────────
if (!process.env.VERCEL) {
  const PORT = parseInt(process.env.PORT || '5000', 10);
  server.listen(PORT, () => {
    console.log(`\n🚀 MediConnect Backend — http://localhost:${PORT}/api/health`);
    console.log(`   Env: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   DB:  ${process.env.DATABASE_URL ? 'DATABASE_URL (cloud)' : 'Variables séparées'}\n`);
  });
}

// ── Exports (Vercel a besoin de l'app Express, pas du server HTTP) ─
module.exports = app;
