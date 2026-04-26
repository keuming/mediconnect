const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME     || 'mediconnect_db',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
  // Modification ici : Neon nécessite SSL même en dev si on utilise l'URL distante
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000, // Augmenté un peu pour le cloud
});

pool.on('connect', () => console.log('✅ PostgreSQL connecté (Cloud)'));
pool.on('error',  (err) => console.error('❌ Erreur PostgreSQL:', err));

const query = (text, params) => pool.query(text, params);
module.exports = { pool, query };