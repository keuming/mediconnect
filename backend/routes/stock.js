const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { query } = require('../config/db');
const { auth, can } = require('../middleware/auth');

const vd = d => d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;

// GET /api/stock
router.get('/', auth, can('clinique', 'admin'), async (req, res) => {
  try {
    const cr = await query('SELECT id FROM cliniques WHERE user_id=$1 LIMIT 1', [req.user.id]);
    const cid = cr.rows[0]?.id;
    const r = cid
      ? await query('SELECT * FROM stock_clinique WHERE clinique_id=$1 ORDER BY nom', [cid])
      : await query('SELECT * FROM stock_clinique ORDER BY nom');
    res.json({ success: true, data: r.rows });
  } catch (e) { res.json({ success: true, data: [] }); }
});

// POST /api/stock
router.post('/', auth, can('clinique', 'admin'), async (req, res) => {
  const { nom, categorie, quantite, seuil_alerte, prix_unitaire, fournisseur, numero_lot, date_expiration } = req.body;
  if (!nom) return res.status(400).json({ success: false, message: 'Nom requis' });
  try {
    const cr = await query('SELECT id FROM cliniques WHERE user_id=$1 LIMIT 1', [req.user.id]);
    const r = await query(
      `INSERT INTO stock_clinique
         (id,clinique_id,nom,categorie,quantite,seuil_alerte,prix_unitaire,fournisseur,numero_lot,date_expiration)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [uuid(), cr.rows[0]?.id, nom, categorie || null, quantite || 0,
       seuil_alerte || 50, prix_unitaire || 0,
       fournisseur || null, numero_lot || null, vd(date_expiration)]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// PUT /api/stock/:id
router.put('/:id', auth, can('clinique', 'admin'), async (req, res) => {
  const { nom, categorie, quantite, seuil_alerte, prix_unitaire, fournisseur, date_expiration } = req.body;
  try {
    const r = await query(
      `UPDATE stock_clinique
       SET nom=COALESCE($1,nom), categorie=COALESCE($2,categorie),
           quantite=COALESCE($3,quantite), seuil_alerte=COALESCE($4,seuil_alerte),
           prix_unitaire=COALESCE($5,prix_unitaire), fournisseur=COALESCE($6,fournisseur),
           date_expiration=COALESCE($7,date_expiration), updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [nom, categorie, quantite, seuil_alerte, prix_unitaire, fournisseur, vd(date_expiration), req.params.id]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// DELETE /api/stock/:id
router.delete('/:id', auth, can('clinique', 'admin'), async (req, res) => {
  try {
    await query('DELETE FROM stock_clinique WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
