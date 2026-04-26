const router = require('express').Router();
const { query } = require('../config/db');
const { auth, authorize } = require('../middleware/auth');
const { v4: uuid } = require('uuid');

// GET /api/assurances/dossiers
router.get('/dossiers', auth, async (req, res) => {
  try {
    let r;
    if (req.user.role === 'clinique') {
      const cid = (await query('SELECT id FROM cliniques WHERE user_id=$1', [req.user.id])).rows[0]?.id;
      r = await query(`SELECT da.*, u.prenom||' '||u.nom AS patient_nom
        FROM dossiers_assurance da LEFT JOIN patients p ON p.id=da.patient_id
        LEFT JOIN utilisateurs u ON u.id=p.user_id
        WHERE da.clinique_id=$1 ORDER BY da.created_at DESC`, [cid]);
    } else if (req.user.role === 'assureur') {
      const aid = (await query('SELECT id FROM assureurs WHERE user_id=$1', [req.user.id])).rows[0]?.id;
      r = await query('SELECT * FROM dossiers_assurance WHERE assureur_id=$1 ORDER BY created_at DESC', [aid]);
    } else {
      r = await query('SELECT * FROM dossiers_assurance ORDER BY created_at DESC LIMIT 100');
    }
    res.json({ success: true, data: r.rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

// POST /api/assurances/dossiers
router.post('/dossiers', auth, authorize('clinique'), async (req, res) => {
  const { patient_id, compagnie, numero_police, diagnostic, actes, montant_total, montant_assur, ticket_moder } = req.body;
  if (!montant_total) return res.status(400).json({ success: false, message: 'Montant requis.' });
  try {
    const cid = (await query('SELECT id FROM cliniques WHERE user_id=$1', [req.user.id])).rows[0]?.id;
    const ref = '#DOS-' + Date.now().toString().slice(-4);
    const id = uuid();
    await query(`INSERT INTO dossiers_assurance (id,reference,patient_id,clinique_id,compagnie,numero_police,diagnostic,actes,montant_total,montant_assur,ticket_moder,statut)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'en_attente')`,
      [id, ref, patient_id||null, cid, compagnie||'', numero_police||'', diagnostic||'', actes||[], montant_total, montant_assur||0, ticket_moder||montant_total]);
    res.status(201).json({ success: true, data: { id, reference: ref }, message: `Dossier ${ref} soumis à l\'assureur.` });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

// PUT /api/assurances/dossiers/:id
router.put('/dossiers/:id', auth, async (req, res) => {
  const { statut, motif_rejet } = req.body;
  try {
    await query('UPDATE dossiers_assurance SET statut=$1, motif_rejet=$2, updated_at=NOW() WHERE id=$3',
      [statut, motif_rejet||null, req.params.id]);
    res.json({ success: true, message: 'Dossier mis à jour.' });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

router.delete('/dossiers/:id', auth, async (req, res) => {
  try {
    await query('DELETE FROM dossiers_assurance WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'Dossier supprimé.' });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

// GET /api/assurances/mon-assurance (patient)
router.get('/mon-assurance', auth, authorize('patient'), async (req, res) => {
  try {
    const p = await query('SELECT id FROM patients WHERE user_id=$1', [req.user.id]);
    if (!p.rows.length) return res.json({ success: true, data: [] });
    const r = await query('SELECT * FROM assurances_patients WHERE patient_id=$1 ORDER BY created_at DESC', [p.rows[0].id]);
    res.json({ success: true, data: r.rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

module.exports = router;
