const router = require('express').Router();
const { query } = require('../config/db');
const { auth, authorize } = require('../middleware/auth');
const { v4: uuid } = require('uuid');

// Créer la table si elle n'existe pas
const init = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS stock (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      clinique_id UUID,
      nom VARCHAR(200) NOT NULL,
      categorie VARCHAR(100) DEFAULT 'Médicament',
      quantite INTEGER DEFAULT 0,
      unite VARCHAR(50) DEFAULT 'boite',
      seuil_alerte INTEGER DEFAULT 10,
      prix_unitaire DECIMAL(12,2),
      fournisseur VARCHAR(200),
      date_expiration DATE,
      code_barre VARCHAR(100),
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {});
};
init();

// GET /api/stock/clinique — alias pour compatibilité frontend
router.get('/clinique', auth, async (req, res) => {
  try {
    const cliniqueId = req.user?.clinique_id;
    let sql = 'SELECT * FROM stock';
    const params = [];
    if (cliniqueId) { params.push(cliniqueId); sql += ' WHERE clinique_id = $1'; }
    sql += ' ORDER BY nom';
    const r = await query(sql, params);
    res.json({ success: true, data: r.rows });
  } catch (err) {
    res.json({ success: true, data: [] });
  }
});

// POST /api/stock/clinique — alias pour compatibilité frontend
router.post('/clinique', auth, authorize('clinique', 'admin', 'pharmacie'), async (req, res) => {
  const { nom, categorie, quantite, unite, seuil_alerte, prix_unitaire, fournisseur, date_expiration } = req.body;
  if (!nom) return res.status(400).json({ success: false, message: 'Nom requis' });
  try {
    const cliniqueId = req.user?.clinique_id;
    const r = await query(
      `INSERT INTO stock (id,clinique_id,nom,categorie,quantite,unite,seuil_alerte,prix_unitaire,fournisseur,date_expiration)
       VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [cliniqueId, nom, categorie||'Médicament', quantite||0, unite||'boite', seuil_alerte||10, prix_unitaire||null, fournisseur||null, date_expiration||null]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/stock
router.get('/', auth, async (req, res) => {
  try {
    const cliniqueId = req.user.clinique_id || req.query.clinique_id;
    let sql = `SELECT * FROM stock`;
    const params = [];
    if (cliniqueId) {
      params.push(cliniqueId);
      sql += ` WHERE clinique_id = $1`;
    }
    sql += ` ORDER BY nom`;
    const r = await query(sql, params);
    res.json({ success: true, data: r.rows });
  } catch (err) {
    // Fallback si table non migrée
    res.json({ success: true, data: [] });
  }
});

// GET /api/stock/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const r = await query('SELECT * FROM stock WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    res.json({ success: true, data: r.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/stock
router.post('/', auth, authorize('clinique', 'admin', 'pharmacie'), async (req, res) => {
  try {
    const { nom, categorie, quantite, unite, seuil_alerte, prix_unitaire, fournisseur, date_expiration, description } = req.body;
    if (!nom) return res.status(400).json({ success: false, message: 'Nom du produit requis' });
    const cliniqueId = req.user.clinique_id;
    const r = await query(
      `INSERT INTO stock (id,clinique_id,nom,categorie,quantite,unite,seuil_alerte,prix_unitaire,fournisseur,date_expiration,description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [uuid(), cliniqueId, nom, categorie||'Médicament', quantite||0, unite||'boite', seuil_alerte||10, prix_unitaire||null, fournisseur||null, date_expiration||null, description||null]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/stock/:id
router.put('/:id', auth, authorize('clinique', 'admin', 'pharmacie'), async (req, res) => {
  try {
    const { nom, categorie, quantite, unite, seuil_alerte, prix_unitaire, fournisseur, date_expiration } = req.body;
    const r = await query(
      `UPDATE stock SET nom=COALESCE($1,nom), categorie=COALESCE($2,categorie), quantite=COALESCE($3,quantite),
       unite=COALESCE($4,unite), seuil_alerte=COALESCE($5,seuil_alerte), prix_unitaire=COALESCE($6,prix_unitaire),
       fournisseur=COALESCE($7,fournisseur), date_expiration=COALESCE($8,date_expiration), updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [nom, categorie, quantite, unite, seuil_alerte, prix_unitaire, fournisseur, date_expiration, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    res.json({ success: true, data: r.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/stock/:id/ajuster — Ajustement de quantité
router.patch('/:id/ajuster', auth, authorize('clinique', 'admin', 'pharmacie'), async (req, res) => {
  try {
    const { delta, motif } = req.body; // delta = +5 ou -3
    const r = await query(
      `UPDATE stock SET quantite = GREATEST(0, quantite + $1), updated_at=NOW() WHERE id=$2 RETURNING *`,
      [delta||0, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    res.json({ success: true, data: r.rows[0], message: `Stock ajusté de ${delta>0?'+':''}${delta}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/stock/:id
router.delete('/:id', auth, authorize('clinique', 'admin'), async (req, res) => {
  try {
    await query('DELETE FROM stock WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'Produit supprimé' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/stock/alertes — Produits sous le seuil
router.get('/alertes/liste', auth, async (req, res) => {
  try {
    const cliniqueId = req.user.clinique_id;
    const r = await query(
      `SELECT * FROM stock WHERE clinique_id=$1 AND quantite <= seuil_alerte ORDER BY quantite ASC`,
      [cliniqueId]
    );
    res.json({ success: true, data: r.rows });
  } catch (err) {
    res.json({ success: true, data: [] });
  }
});

module.exports = router;
