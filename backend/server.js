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
    origin: true, // Autorise dynamiquement l'origine du frontend
    methods: ['GET', 'POST'],
    credentials: true,
  }
});

// ── Middleware de sécurité & logs ──────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: false, // Nécessaire pour afficher les images d'uploads
}));

// Configuration CORS robuste
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_2,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Autorise les requêtes sans origin (comme Postman) ou les domaines Vercel
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Bloqué par CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));

app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Limitation des requêtes (Rate Limiting) ────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Trop de tentatives, réessayez dans 15 minutes.' }
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 200
});

app.use('/api/auth', authLimiter);
app.use('/api/', apiLimiter);

// ── Routes API ─────────────────────────────────────────────────────
const register = (path, route) => app.use(`/api${path}`, require(route));

register('/auth',           './routes/auth');
register('/utilisateurs',   './routes/utilisateurs');
register('/cliniques',      './routes/cliniques');
register('/medecins',       './routes/medecins');
register('/patients',       './routes/patients');
register('/rendez-vous',    './routes/rendezVous');
register('/consultations',  './routes/consultations');
register('/ordonnances',    './routes/ordonnances');
register('/pharmacies',     './routes/pharmacies');
register('/commandes',      './routes/commandes');
registerRoutes = register; // Alias pour la clarté
register('/assurances',     './routes/assurances');
register('/factures',       './routes/factures');
register('/stock',          './routes/stock');
register('/caisse',         './routes/caisse');
register('/livreurs',       './routes/livreurs');
register('/notifications',  './routes/notifications');

// ── Health check ──────────────────────────────────────────────────
app.get(['/api/health', '/health'], (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Socket.IO — Logique Temps Réel ────────────────────────────────
const livreurPositions = {};

io.on('connection', (socket) => {
  console.log(`🔌 Client connecté : ${socket.id}`);

  // GPS Livreurs
  socket.on('livreur:position', (data) => {
    livreurPositions[data.livreur_id] = { ...data, ts: Date.now() };
    io.emit('livreur:positions', Object.values(livreurPositions));
  });

  // Salons (Rooms)
  socket.on('join:clinique', (id) => socket.join(`clinique:${id}`));
  socket.on('join:patient', (id) => socket.join(`patient:${id}`));

  // Notifications
  socket.on('notification:send', (data) => {
    io.to(`patient:${data.patient_id}`).emit('notification:new', data);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client déconnecté : ${socket.id}`);
  });
});

// ── Gestion des erreurs ───────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erreur interne du serveur'
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route introuvable' });
});

// ── Démarrage ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

// Sur Vercel, on exporte l'app. En local, on lance le serveur.
if (process.env.NODE_ENV !== 'production') {
  server.listen(PORT, () => {
    console.log(`🚀 Serveur MediConnect : http://localhost:${PORT}`);
  });
}

module.exports = app;