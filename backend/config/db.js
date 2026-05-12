require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const cleanUrl = (u) => u ? u.replace(/[?&]channel_binding=[^&]*/g, '') : u;

// Détection locale fiable
const isLocal =
  process.env.NODE_ENV === 'development'                  ||
  process.env.NODE_ENV !== 'production'                   ||
  process.env.DB_HOST === 'localhost'                     ||
  process.env.DB_HOST === '127.0.0.1'                     ||
  (process.env.DATABASE_URL || '').includes('localhost')  ||
  (process.env.DATABASE_URL || '').includes('127.0.0.1');

const pool = new Pool(
  isLocal
    ? {
        user:                    process.env.DB_USER,
        host:                    process.env.DB_HOST     || 'localhost',
        database:                process.env.DB_NAME,
        password:                String(process.env.DB_PASSWORD || ''),
        port:                    parseInt(process.env.DB_PORT)  || 5432,
        ssl:                     false,
        max:                     10,
        idleTimeoutMillis:       30000,
        connectionTimeoutMillis: 10000,
      }
    : {
        connectionString:        cleanUrl(process.env.DATABASE_URL),
        ssl:                     { rejectUnauthorized: false },
        max:                     5,
        idleTimeoutMillis:       30000,
        connectionTimeoutMillis: 10000,
      }
);

pool.on('error', (err) => {
  console.error('[DB] Erreur pool:', err.message);
});

// Helper requête
const query = async (text, params) => {
  const client = await pool.connect();
  try { return await client.query(text, params); }
  finally { client.release(); }
};

module.exports = { query, pool };
