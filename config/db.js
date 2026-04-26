const { Pool } = require('pg');
require('dotenv').config();

// Configuration de la connexion
// Sur Vercel, l'utilisation de DATABASE_URL est plus fiable que les variables séparées
const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Priorité à la chaîne complète (Neon Pooler)
  
  // Si DATABASE_URL n'est pas définie, on utilise les variables séparées (fallback)
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME     || 'mediconnect_db',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',

  // CONFIGURATION SSL CRUCIALE POUR NEON ET VERCEL
  ssl: isProduction || process.env.DB_SSL === 'true' 
    ? { rejectUnauthorized: false } 
    : false,

  // Paramètres d'optimisation pour le Cloud
  max: 10, // Réduit à 10 pour éviter de saturer les connexions Neon en Serverless
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Augmenté à 10s pour pallier les "Cold Starts" de Vercel
});

// Logs de debug pour vérifier la source de connexion
pool.on('connect', () => {
  if (isProduction) {
    console.log('✅ Mediconnect connecté à Neon (Production)');
  } else {
    console.log('✅ PostgreSQL connecté localement');
  }
});

pool.on('error', (err) => {
  console.error('❌ Erreur critique PostgreSQL:', err.message);
});

// Exportation pour utilisation dans les routes (auth, patients, etc.)
module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};