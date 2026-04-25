require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const http       = require('http');
const { Server } = require('socket.io');
const path       = require('path');

const app    = express();
const server = http.createServer(app);

// ── Configuration Socket.IO ────────────────────────────────────────
const io = new Server(server, {
  cors: { 
    origin: "*", 
    methods: ['GET', 'POST'],
    credentials: true 
  }
});

// ── Middleware ────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

// Configuration CORS dynamique (Accepte localhost et TOUS les domaines Vercel)
app.use(cors({ 
  origin: function (origin, callback) {
    const isVercel = origin && origin.endsWith('.vercel.app');
    const isLocal = !origin || origin.includes('localhost');
    
    if (isLocal || isVercel) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Route de Base ─────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send('🚀 MediConnect API est en ligne et fonctionnelle !');
});

// ── Double Routage Stratégique ────────────────────────────────────
const registerRoutes = (prefix, routerPath) => {
  try {
    const router = require(routerPath);
    app.use(`/api${prefix}`, router); 
    app.use(prefix, router);          
  } catch (error) {
    console.error(`Erreur chargement route ${prefix}:`, error.message);
  }
};

registerRoutes('/auth',           './routes/auth');
registerRoutes('/utilisateurs',   './routes/utilisateurs');
registerRoutes('/cliniques',      './routes/cliniques');
registerRoutes('/medecins',       './routes/medecins');
registerRoutes('/patients',       './routes/patients');
registerRoutes('/rendez-vous',    './routes/rendezVous');
registerRoutes('/consultations',  './routes/consultations');
registerRoutes('/ordonnances',    './routes/ordonnances');
registerRoutes('/pharmacies',     './routes/pharmacies');
registerRoutes('/commandes',      './routes/commandes');
registerRoutes('/assurances',     './routes/assurances');
registerRoutes('/factures',       './routes/factures');
registerRoutes('/stock',          './routes/stock');
registerRoutes('/caisse',         './routes/caisse');
registerRoutes('/livreurs',       './routes/livreurs');
registerRoutes('/notifications',  './routes/notifications');

// ── Health check ──────────────────────────────────────────────────
app.get(['/api/health', '/health'], (req, res) => res.json({
  status: 'ok', 
  timestamp: new Date().toISOString()
}));

// ── Socket.IO ─────────────────────────────────────────────────────
const livreurPositions = {};
io.on('connection', (socket) => {
  socket.on('livreur:position', (data) => {
    livreurPositions[data.livreur_id] = { ...data, ts: Date.now() };
    io.emit('livreur:positions', Object.values(livreurPositions));
  });
  socket.on('disconnect', () => console.log('🔌 Client déconnecté'));
});

// ── Gestion des Erreurs ───────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err);
  res.status(err.status || 500).json({ success: false, message: err.message });
});

app.use((req, res) => res.status(404).json({ 
  success: false, 
  message: `Route introuvable : ${req.originalUrl}` 
}));

// ── Démarrage ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
  server.listen(PORT, () => console.log(`🚀 Serveur local sur port ${PORT}`));
}

module.exports = app;