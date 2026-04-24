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
const io     = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000', methods: ['GET','POST'] }
});

// ── Middleware ────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting
app.use('/api/auth', rateLimit({ windowMs: 15*60*1000, max: 20, message: 'Trop de tentatives, réessayez dans 15 minutes.' }));
app.use('/api/',     rateLimit({ windowMs: 1*60*1000,  max: 200 }));

// Route de test pour confirmer que Vercel voit bien le fichier
app.get('/', (req, res) => {
  res.send('🚀 MediConnect API est en ligne et fonctionnelle !');
});

// ── Routes ────────────────────────────────────────────────────────
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
app.get('/api/health', (req, res) => res.json({
  status: 'ok', env: process.env.NODE_ENV, timestamp: new Date().toISOString()
}));

// ── Socket.IO — GPS en temps réel ─────────────────────────────────
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

// ── Erreur globale ────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erreur interne du serveur'
  });
});

app.use((req, res) => res.status(404).json({ success: false, message: 'Route introuvable' }));

// ── Démarrage ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 MediConnect Backend v2 — http://localhost:${PORT}`);
  console.log(`🌍 Environnement : ${process.env.NODE_ENV}`);
});

// Remplace ton module.exports actuel par celui-ci :
module.exports = app;
