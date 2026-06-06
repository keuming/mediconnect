require('dotenv').config();
const { Pool } = require('pg');

const cleanUrl = (u) => u ? u.replace(/[?&]channel_binding=[^&]*/g, '') : u;

const pool = new Pool({
  connectionString: cleanUrl(process.env.DATABASE_URL),
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 20000,
  connectionTimeoutMillis: 8000,
});

const db = async (text, params) => {
  const c = await pool.connect();
  try { return await c.query(text, params); }
  finally { c.release(); }
};

module.exports = { db, pool };
