const { Pool } = require('pg');

// ── Configuration du pool PostgreSQL ─────────────────────────────
// Neon exige channel_binding=disable sur Vercel serverless
// DATABASE_URL prioritaire, fallback variables séparées

const getPoolConfig = () => {
  if (process.env.DATABASE_URL) {
    // Nettoyer l'URL : retirer channel_binding si présent, forcer sslmode=require
    let url = process.env.DATABASE_URL;
    url = url.replace(/[&?]channel_binding=[^&]*/g, '');
    if (!url.includes('sslmode=')) {
      url += (url.includes('?') ? '&' : '?') + 'sslmode=require';
    }
    return {
      connectionString: url,
      ssl: { rejectUnauthorized: false },
      max: 5,          // Réduit pour Neon serverless (limite de connexions)
      min: 0,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 10000,
      allowExitOnIdle: true,
    };
  }
  // Fallback variables séparées (dev local)
  return {
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME     || 'mediconnect_db',
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl:      process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 10,
    min: 0,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  };
};

const pool = new Pool(getPoolConfig());

pool.on('error', (err) => {
  console.error('[DB] Erreur pool inattendue:', err.message);
  // NE PAS appeler process.exit() — tue les fonctions Vercel serverless
});

// Wrapper query avec gestion d'erreur améliorée
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DB] ${Date.now() - start}ms`, text.slice(0, 80));
    }
    return res;
  } catch (err) {
    console.error('[DB] Erreur query:', err.message, '\nSQL:', text.slice(0, 100));
    throw err;
  }
};

module.exports = { pool, query };