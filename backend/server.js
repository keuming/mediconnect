require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const http       = require('http');
const { Server } = require('socket.io');
const rateLimit  = require('express-rate-limit');
const path       = require('path');

const app    = express();
const server = http.createServer(app);

// ── Configuration Socket.IO ────────────────────────────────────────
const io = new Server(server, {
  cors: { 
    origin: [
      process.env.FRONTEND_URL, 
      'http://localhost:3000',
      'https://mediconnect-m9xf.vercel.app'
    ], 
    methods: ['GET', 'POST'],
    credentials: true 
  }
});

// ── Middleware ────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: false, // Nécessaire pour afficher les images/uploads
}));

// Configuration CORS Ultra-Large pour Vercel
app.use(cors({ 
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000', 
      'https://mediconnect-m9xf.vercel.app',
      process.env.FRONTEND_URL
    ];
    // Autorise les requêtes sans origine (comme les apps mobiles ou curl) 
    // et les sous-domaines vercel.app
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Rate limiting ─────────────────────────────────────────────────
const authLimiter = rateLimit({ 
  windowMs: 15 * 60 * 1000, 
  max: 50, // Augmenté un peu pour les tests
  message: { success: false, message: 'Trop de tentatives, réessayez dans 15 minutes.' } 
});
app.use('/api/auth', authLimiter);
app.use('/api/', rateLimit({ windowMs: 1 * 60 * 1000, max: 200 }));

// ── Route de Base & Health Check ──────────────────────────────────
app.get('/', (req, res) => {
  res.send('🚀 MediConnect API est en ligne et fonctionnelle !');
});

app.get('/api/health', (req, res) => res.json({
  status: 'ok', 
  env: process.env.NODE_ENV, 
  timestamp: new Date().toISOString()
}));

// ── Routes API ────────────────────────────────────────────────────
app.use('/api/auth',           require('./routes/auth'));
app.use('/api/utilisateurs',   require('./routes/utilisateurs'));
app.use('/api/cliniques',      require('./routes/cliniques'));
app.use('/api/medecins',       require('./routes/medecins'));
app.use('/api/patients',       require('./routes/patients'));
app.use('/api/rendez-vous',    require('./routes/rendezVous'));
app.use('/api/consultations',  require('./routes/consultations'));
app.use('/api/ordonnances',    require('./routes/ordonnances'));
app.use('/api/pharmacies',     require('./routes/pharmacies'));
app.use('/api/commandes',      require('./routes/commandes'));
app.use('/api/assurances',     require('./routes/assurances'));
app.use('/api/factures',       require('./routes/factures'));
app.use('/api/stock',          require('./routes/stock'));
app.use('/api/caisse',         require('./routes/caisse'));
app.use('/api/livreurs',       require('./routes/livreurs'));
app.use('/api/notifications',  require('./routes/notifications'));

// ── Socket.IO — GPS & Notifications ───────────────────────────────
const livreurPositions = {};

io.on('connection', (socket) => {
  console.log('🔌 Client connecté:', socket.id);

  socket.on('livreur:position', (data) => {
    livreurPositions[data.livreur_id] = { ...data, ts: Date.now() };
    io.emit('livreur:positions', Object.values(livreurPositions));
  });

  socket.on('join:clinique', (clinique_id) => socket.join(`clinique:${clinique_id}`));
  socket.on('join:patient',  (patient_id)  => socket.join(`patient:${patient_id}`));

  socket.on('notification:send', (data) => {
    io.to(`patient:${data.patient_id}`).emit('notification:new', data);
  });

  socket.on('disconnect', () => console.log('🔌 Client déconnecté:', socket.id));
});

// ── Gestion des Erreurs ───────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erreur interne du serveur'
  });
});

app.use((req, res) => res.status(404).json({ success: false, message: 'Route introuvable' }));

// ── Démarrage (Listen uniquement si pas sur Vercel) ────────────────
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
  server.listen(PORT, () => {
    console.log(`🚀 MediConnect Backend Local — http://localhost:${PORT}`);
  });
}

// Export pour Vercel
module.exports = app;