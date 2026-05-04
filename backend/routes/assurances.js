const router = require('express').Router();
const { query } = require('../config/db');
const { auth } = require('../middleware/auth');
const { v4: uuid } = require('uuid');

const init = async () => {
  await query(`CREATE TABLE IF NOT EXISTS dossiers_assurance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinique_id UUID, patient_id UUID, patient_nom VARCHAR(200),
    compagnie VARCHAR(100), numero_police VARCHAR(100),
    montant_total DECIMAL(12,2), montant_assur DECIMAL(12,2),
    ticket_moder DECIMAL(12,2), taux_couverture INTEGER DEFAULT 80,
    diagnostic TEXT, statut VARCHAR(30) DEFAULT 'soumis',
    motif_rejet TEXT, reference VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
  )`).catch(e => console.error('Table dossiers_assurance:', e.message));
};
init();

router.get('/', auth, async (req, res) => {
  try {
    const cliniqueId = req.user?.clinique_id;
    let sql = 'SELECT * FROM dossiers_assurance WHERE 1=1';
    const params = [];
    if (cliniqueId) { params.push(cliniqueId); sql += ` AND clinique_id=$${params.length}`; }
    sql += ' ORDER BY created_at DESC';
    const r = await query(sql, params);
    res.json({ success: true, data: r.rows });
  } catch(err) { res.json({ success: true, data: [] }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { patient_nom, patient_id, compagnie, numero_police, montant_total, montant_assur, ticket_moder, taux_couverture, diagnostic } = req.body;
    if (!patient_nom || !compagnie) return res.status(400).json({ success: false, message: 'Patient et compagnie requis' });
    const cliniqueId = req.user?.clinique_id;
    const ref = 'ASS-' + Date.now().toString(36).toUpperCase();
    const r = await query(
      `INSERT INTO dossiers_assurance (id,reference,clinique_id,patient_id,patient_nom,compagnie,numero_police,montant_total,montant_assur,ticket_moder,taux_couverture,diagnostic)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [uuid(),ref,cliniqueId,patient_id||null,patient_nom,compagnie,numero_police||null,montant_total||0,montant_assur||0,ticket_moder||0,taux_couverture||80,diagnostic||null]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { statut, motif_rejet } = req.body;
    const r = await query(
      `UPDATE dossiers_assurance SET statut=COALESCE($1,statut), motif_rejet=COALESCE($2,motif_rejet), updated_at=NOW() WHERE id=$3 RETURNING *`,
      [statut, motif_rejet||null, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ success: false, message: 'Dossier introuvable' });
    res.json({ success: true, data: r.rows[0] });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await query('DELETE FROM dossiers_assurance WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'Supprimé' });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
