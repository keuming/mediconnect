const router = require('express').Router();
const { query } = require('../config/db');
const { auth, authorize } = require('../middleware/auth');
const { v4: uuid } = require('uuid');

const init = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS factures (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reference VARCHAR(50),
      clinique_id UUID,
      patient_id UUID,
      patient_nom VARCHAR(200),
      consultation_id UUID,
      rdv_id UUID,
      montant DECIMAL(12,2) NOT NULL DEFAULT 0,
      montant_assurance DECIMAL(12,2) DEFAULT 0,
      montant_patient DECIMAL(12,2) DEFAULT 0,
      mode_paiement VARCHAR(50) DEFAULT 'Espèces',
      statut VARCHAR(30) DEFAULT 'en_attente',
      assurance VARCHAR(100),
      numero_police VARCHAR(100),
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {});
};
init();


// GET /api/factures/clinique — alias pour compatibilité
router.get('/clinique', auth, async (req, res) => {
  try {
    const cliniqueId = req.user?.clinique_id;
    let sql = 'SELECT * FROM factures WHERE 1=1';
    const params = [];
    if (cliniqueId) { params.push(cliniqueId); sql += ` AND clinique_id=$${params.length}`; }
    sql += ' ORDER BY created_at DESC LIMIT 100';
    const r = await query(sql, params);
    res.json({ success:true, data:r.rows });
  } catch(err) {
    res.json({ success:true, data:[] });
  }
});

// GET /api/factures
router.get('/', auth, async (req, res) => {
  try {
    const cliniqueId = req.user.clinique_id;
    const patientId = req.user.patient_id;
    let sql = 'SELECT * FROM factures WHERE 1=1';
    const params = [];
    if (cliniqueId) { params.push(cliniqueId); sql += ` AND clinique_id=$${params.length}`; }
    if (patientId)  { params.push(patientId);  sql += ` AND patient_id=$${params.length}`; }
    sql += ' ORDER BY created_at DESC LIMIT 100';
    const r = await query(sql, params);
    res.json({ success: true, data: r.rows });
  } catch (err) {
    res.json({ success: true, data: [] });
  }
});

// POST /api/factures
router.post('/', auth, authorize('clinique', 'admin'), async (req, res) => {
  try {
    const { patient_nom, patient_id, montant, mode_paiement, statut, assurance, notes, consultation_id, rdv_id } = req.body;
    if (!montant) return res.status(400).json({ success: false, message: 'Montant requis' });
    const cliniqueId = req.user.clinique_id;
    const ref = 'FAC-' + Date.now().toString(36).toUpperCase();
    const r = await query(
      `INSERT INTO factures (id,reference,clinique_id,patient_id,patient_nom,montant,mode_paiement,statut,assurance,notes,consultation_id,rdv_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [uuid(), ref, cliniqueId, patient_id||null, patient_nom||null, montant, mode_paiement||'Espèces', statut||'en_attente', assurance||null, notes||null, consultation_id||null, rdv_id||null]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/factures/:id
router.put('/:id', auth, authorize('clinique', 'admin'), async (req, res) => {
  try {
    const { statut, mode_paiement, montant_assurance, notes } = req.body;
    const r = await query(
      `UPDATE factures SET statut=COALESCE($1,statut), mode_paiement=COALESCE($2,mode_paiement),
       montant_assurance=COALESCE($3,montant_assurance), notes=COALESCE($4,notes), updated_at=NOW()
       WHERE id=$5 RETURNING *`,
      [statut, mode_paiement, montant_assurance, notes, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ success: false, message: 'Facture introuvable' });
    res.json({ success: true, data: r.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
