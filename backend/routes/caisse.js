const router = require('express').Router();
const { query } = require('../config/db');
const { auth, authorize } = require('../middleware/auth');
const { v4: uuid } = require('uuid');

const init = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS caisse_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      clinique_id UUID,
      date DATE DEFAULT CURRENT_DATE,
      statut VARCHAR(20) DEFAULT 'ouverte',
      montant_ouverture DECIMAL(12,2) DEFAULT 0,
      total_encaisse DECIMAL(12,2) DEFAULT 0,
      total_decaisse DECIMAL(12,2) DEFAULT 0,
      opened_by UUID,
      closed_by UUID,
      opened_at TIMESTAMPTZ DEFAULT NOW(),
      closed_at TIMESTAMPTZ,
      notes TEXT
    )
  `).catch(() => {});

  await query(`
    CREATE TABLE IF NOT EXISTS caisse_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID,
      clinique_id UUID,
      type VARCHAR(20) DEFAULT 'encaissement',
      montant DECIMAL(12,2) NOT NULL,
      mode_paiement VARCHAR(50) DEFAULT 'Espèces',
      reference VARCHAR(200),
      patient_nom VARCHAR(200),
      motif TEXT,
      created_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(() => {});
};
init();


// GET /api/caisse/clinique — alias pour compatibilité
router.get('/clinique', auth, async (req, res) => {
  try {
    const cliniqueId = req.user?.clinique_id;
    if (!cliniqueId) return res.json({ success:true, data:{ statut:'fermee', total_encaisse:0, total_decaisse:0 } });
    const r = await query(
      "SELECT * FROM caisse_sessions WHERE clinique_id=$1 AND date=CURRENT_DATE AND statut='ouverte' ORDER BY opened_at DESC LIMIT 1",
      [cliniqueId]
    );
    if (!r.rows.length) return res.json({ success:true, data:{ statut:'fermee', total_encaisse:0, total_decaisse:0 } });
    res.json({ success:true, data:r.rows[0] });
  } catch(err) {
    res.json({ success:true, data:{ statut:'fermee', total_encaisse:0, total_decaisse:0 } });
  }
});

// GET /api/caisse — Session du jour
router.get('/', auth, async (req, res) => {
  try {
    const cliniqueId = req.user.clinique_id;
    const r = await query(
      `SELECT * FROM caisse_sessions WHERE clinique_id=$1 AND date=CURRENT_DATE AND statut='ouverte' ORDER BY opened_at DESC LIMIT 1`,
      [cliniqueId]
    );
    if (!r.rows.length) return res.json({ success: true, data: { statut: 'fermee', total_encaisse: 0, total_decaisse: 0 } });
    const session = r.rows[0];

    // Transactions de la session
    const txns = await query('SELECT * FROM caisse_transactions WHERE session_id=$1 ORDER BY created_at DESC', [session.id]);
    session.transactions = txns.rows;
    res.json({ success: true, data: session });
  } catch (err) {
    res.json({ success: true, data: { statut: 'fermee', total_encaisse: 0, total_decaisse: 0 } });
  }
});

// POST /api/caisse/ouvrir
router.post('/ouvrir', auth, authorize('clinique', 'admin'), async (req, res) => {
  try {
    const { montant_ouverture } = req.body;
    const cliniqueId = req.user.clinique_id;
    const existing = await query(
      `SELECT id FROM caisse_sessions WHERE clinique_id=$1 AND date=CURRENT_DATE AND statut='ouverte'`,
      [cliniqueId]
    );
    if (existing.rows.length) return res.status(409).json({ success: false, message: 'Une session est déjà ouverte aujourd\'hui' });
    const r = await query(
      `INSERT INTO caisse_sessions (id,clinique_id,montant_ouverture,opened_by) VALUES ($1,$2,$3,$4) RETURNING *`,
      [uuid(), cliniqueId, montant_ouverture||0, req.user.id]
    );
    res.status(201).json({ success: true, data: r.rows[0], message: 'Caisse ouverte !' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/caisse/encaisser
router.post('/encaisser', auth, authorize('clinique', 'admin'), async (req, res) => {
  try {
    const { montant, mode_paiement, patient_nom, reference } = req.body;
    if (!montant || montant <= 0) return res.status(400).json({ success: false, message: 'Montant invalide' });
    const cliniqueId = req.user.clinique_id;
    const sess = await query(`SELECT id FROM caisse_sessions WHERE clinique_id=$1 AND date=CURRENT_DATE AND statut='ouverte' LIMIT 1`, [cliniqueId]);
    if (!sess.rows.length) return res.status(400).json({ success: false, message: 'Aucune caisse ouverte' });
    const sessionId = sess.rows[0].id;
    await query(`UPDATE caisse_sessions SET total_encaisse = total_encaisse + $1 WHERE id=$2`, [montant, sessionId]);
    const txn = await query(
      `INSERT INTO caisse_transactions (id,session_id,clinique_id,type,montant,mode_paiement,patient_nom,reference,created_by)
       VALUES ($1,$2,$3,'encaissement',$4,$5,$6,$7,$8) RETURNING *`,
      [uuid(), sessionId, cliniqueId, montant, mode_paiement||'Espèces', patient_nom||null, reference||null, req.user.id]
    );
    res.status(201).json({ success: true, data: txn.rows[0], message: `${Number(montant).toLocaleString('fr-CI')} FCFA encaissés` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/caisse/decaisser
router.post('/decaisser', auth, authorize('clinique', 'admin'), async (req, res) => {
  try {
    const { montant, motif } = req.body;
    if (!montant || montant <= 0) return res.status(400).json({ success: false, message: 'Montant invalide' });
    const cliniqueId = req.user.clinique_id;
    const sess = await query(`SELECT id FROM caisse_sessions WHERE clinique_id=$1 AND date=CURRENT_DATE AND statut='ouverte' LIMIT 1`, [cliniqueId]);
    if (!sess.rows.length) return res.status(400).json({ success: false, message: 'Aucune caisse ouverte' });
    const sessionId = sess.rows[0].id;
    await query(`UPDATE caisse_sessions SET total_decaisse = total_decaisse + $1 WHERE id=$2`, [montant, sessionId]);
    const txn = await query(
      `INSERT INTO caisse_transactions (id,session_id,clinique_id,type,montant,motif,created_by)
       VALUES ($1,$2,$3,'decaissement',$4,$5,$6) RETURNING *`,
      [uuid(), sessionId, cliniqueId, montant, motif||null, req.user.id]
    );
    res.status(201).json({ success: true, data: txn.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/caisse/cloturer
router.post('/cloturer', auth, authorize('clinique', 'admin'), async (req, res) => {
  try {
    const { notes } = req.body;
    const cliniqueId = req.user.clinique_id;
    const r = await query(
      `UPDATE caisse_sessions SET statut='fermee', closed_by=$1, closed_at=NOW(), notes=$2
       WHERE clinique_id=$3 AND date=CURRENT_DATE AND statut='ouverte' RETURNING *`,
      [req.user.id, notes||null, cliniqueId]
    );
    if (!r.rows.length) return res.status(400).json({ success: false, message: 'Aucune caisse ouverte' });
    res.json({ success: true, data: r.rows[0], message: 'Caisse clôturée' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/caisse/historique
router.get('/historique', auth, async (req, res) => {
  try {
    const cliniqueId = req.user.clinique_id;
    const r = await query(
      `SELECT * FROM caisse_sessions WHERE clinique_id=$1 ORDER BY date DESC LIMIT 30`,
      [cliniqueId]
    );
    res.json({ success: true, data: r.rows });
  } catch (err) {
    res.json({ success: true, data: [] });
  }
});

module.exports = router;
