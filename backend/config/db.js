const { Pool } = require('pg');

// Nettoyer l'URL de connexion (supprimer channel_binding incompatible avec Neon)
const cleanUrl = (url) => {
  if (!url) return url;
  try {
    const u = new URL(url);
    u.searchParams.delete('channel_binding');
    return u.toString();
  } catch {
    return url.replace(/[?&]channel_binding=[^&]*/g, '');
  }
};

const connectionString = cleanUrl(process.env.DATABASE_URL);

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('[DB] Erreur pool PostgreSQL:', err.message);
});

const query = async (text, params) => {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
};

module.exports = { query, pool };
