const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { v4: uuid } = require('uuid');
const jwt = require('jsonwebtoken');

const ADMIN_SECRET = process.env.JWT_SECRET || 'mediconnect_dev_secret_2024';
const CARD_ADMIN_PASSWORD = process.env.CARD_ADMIN_PASSWORD || 'nexova_card_2024';

// ── Middleware auth card admin ────────────────────────────────────
function cardAuth(req, res, next) {
  const token = req.headers['x-card-token'];
  if (!token) return res.status(401).json({ success: false, message: 'Token requis' });
  try {
    jwt.verify(token, ADMIN_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token invalide' });
  }
}

// ── Init table ────────────────────────────────────────────────────
router.post('/init', async (req, res) => {
  try {
    await db(`CREATE TABLE IF NOT EXISTS mediconnect_card_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      numero_carte VARCHAR(50) UNIQUE,
      prenom VARCHAR(100) NOT NULL,
      nom VARCHAR(100) NOT NULL,
      date_naissance DATE,
      groupe_sanguin VARCHAR(10),
      allergies TEXT,
      contact_urgence VARCHAR(50),
      email VARCHAR(200),
      telephone VARCHAR(30),
      adresse TEXT,
      ville VARCHAR(100),
      pays_code VARCHAR(5) DEFAULT 'CI',
      contact_parent VARCHAR(100),
      telephone_parent VARCHAR(30),
      taille VARCHAR(10),
      poids VARCHAR(10),
      statut VARCHAR(30) DEFAULT 'en_attente',
      carte_generee_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    res.json({ success: true, message: 'Table mediconnect_card_requests creee' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── Login admin ───────────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (password !== CARD_ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: 'Mot de passe incorrect' });
  }
  const token = jwt.sign({ role: 'card_admin' }, ADMIN_SECRET, { expiresIn: '24h' });
  res.json({ success: true, token });
});

// ── Soumettre une demande (depuis app mobile) ─────────────────────
router.post('/request', async (req, res) => {
  const {
    prenom, nom, date_naissance, groupe_sanguin, allergies,
    contact_urgence, email, telephone, adresse, ville,
    pays_code, contact_parent, telephone_parent, taille, poids
  } = req.body;
  if (!prenom || !nom) {
    return res.status(400).json({ success: false, message: 'Prénom et nom requis' });
  }
  try {
    const count = await db('SELECT COUNT(*) FROM mediconnect_card_requests');
    const seq = String(parseInt(count.rows[0].count) + 1).padStart(6, '0');
    const numero = `MC-${pays_code || 'CI'}-${new Date().getFullYear()}-${seq}`;
    const r = await db(
      `INSERT INTO mediconnect_card_requests
       (id, numero_carte, prenom, nom, date_naissance, groupe_sanguin, allergies,
        contact_urgence, email, telephone, adresse, ville, pays_code,
        contact_parent, telephone_parent, taille, poids)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
      [uuid(), numero, prenom, nom, date_naissance||null, groupe_sanguin||null,
       allergies||null, contact_urgence||null, email||null, telephone||null,
       adresse||null, ville||null, pays_code||'CI', contact_parent||null,
       telephone_parent||null, taille||null, poids||null]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── Liste des demandes (admin) ────────────────────────────────────
router.get('/requests', cardAuth, async (req, res) => {
  const { statut } = req.query;
  try {
    const where = statut ? `WHERE statut = '${statut}'` : '';
    const r = await db(
      `SELECT * FROM mediconnect_card_requests ${where} ORDER BY created_at DESC`
    );
    res.json({ success: true, data: r.rows });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── Marquer comme générée ─────────────────────────────────────────
router.put('/requests/:id/generate', cardAuth, async (req, res) => {
  try {
    const r = await db(
      `UPDATE mediconnect_card_requests
       SET statut='generee', carte_generee_at=NOW(), updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    if (!r.rows[0]) return res.status(404).json({ success: false, message: 'Demande non trouvée' });
    res.json({ success: true, data: r.rows[0] });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── Detail d'une demande ──────────────────────────────────────────
router.get('/requests/:id', cardAuth, async (req, res) => {
  try {
    const r = await db('SELECT * FROM mediconnect_card_requests WHERE id=$1', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ success: false, message: 'Non trouvée' });
    res.json({ success: true, data: r.rows[0] });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── Supprimer une demande ─────────────────────────────────────────
router.delete('/requests/:id', cardAuth, async (req, res) => {
  try {
    await db('DELETE FROM mediconnect_card_requests WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'Supprimée' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
