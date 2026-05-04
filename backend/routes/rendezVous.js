const router = require('express').Router();
const { query } = require('../config/db');
const { auth, authorize } = require('../middleware/auth');
const { v4: uuid } = require('uuid');

// ── Auto-création des tables ──────────────────────────────────────
const init = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS rendez_vous (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reference VARCHAR(50),
      clinique_id UUID,
      patient_id UUID,
      patient_nom VARCHAR(200),
      medecin_id UUID,
      medecin_nom VARCHAR(200),
      disponibilite_id UUID,
      date_rdv DATE NOT NULL,
      heure_rdv TIME NOT NULL,
      motif TEXT,
      statut VARCHAR(30) DEFAULT 'en_attente',
      assurance VARCHAR(100),
      numero_police VARCHAR(100),
      source VARCHAR(30) DEFAULT 'dashboard',
      accompagnant_nom VARCHAR(200),
      accompagnant_tel VARCHAR(30),
      accompagnant_relation VARCHAR(40),
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `).catch(e => console.error('Table rendez_vous:', e.message));
};
init();

// ── GET /api/rendez-vous ─────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { date, statut, medecin_id, patient_id } = req.query;
    const cliniqueId = req.user?.clinique_id;
    const patientId  = req.user?.patient_id || patient_id;

    let sql = 'SELECT * FROM rendez_vous WHERE 1=1';
    const params = [];

    if (cliniqueId) {
      params.push(cliniqueId);
      sql += ` AND clinique_id = $${params.length}`;
    }
    if (patientId && !cliniqueId) {
      params.push(patientId);
      sql += ` AND patient_id = $${params.length}`;
    }
    if (date) {
      params.push(date);
      sql += ` AND date_rdv = $${params.length}`;
    }
    if (statut) {
      params.push(statut);
      sql += ` AND statut = $${params.length}`;
    }
    if (medecin_id) {
      params.push(medecin_id);
      sql += ` AND medecin_id = $${params.length}`;
    }

    sql += ' ORDER BY date_rdv, heure_rdv LIMIT 200';
    const r = await query(sql, params);
    res.json({ success: true, data: r.rows });
  } catch (err) {
    console.error('[GET /rendez-vous]', err.message);
    res.json({ success: true, data: [] });
  }
});

// ── GET /api/rendez-vous/:id ─────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const r = await query('SELECT * FROM rendez_vous WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, message: 'RDV introuvable' });
    res.json({ success: true, data: r.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/rendez-vous ────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const {
      patient_nom, patient_id, medecin_nom, medecin_id,
      date_rdv, heure_rdv, motif, statut, assurance,
      numero_police, source, accompagnant_nom, accompagnant_tel,
      accompagnant_relation, notes, disponibilite_id
    } = req.body;

    if (!date_rdv || !heure_rdv) {
      return res.status(400).json({ success: false, message: 'Date et heure requises' });
    }

    const cliniqueId = req.user?.clinique_id;
    const ref = 'RDV-' + Date.now().toString(36).toUpperCase();

    const r = await query(
      `INSERT INTO rendez_vous
        (id, reference, clinique_id, patient_id, patient_nom, medecin_id, medecin_nom,
         disponibilite_id, date_rdv, heure_rdv, motif, statut, assurance, numero_police,
         source, accompagnant_nom, accompagnant_tel, accompagnant_relation, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
       RETURNING *`,
      [
        uuid(), ref, cliniqueId || null,
        patient_id || null, patient_nom || null,
        medecin_id || null, medecin_nom || null,
        disponibilite_id || null,
        date_rdv, heure_rdv,
        motif || null, statut || 'en_attente',
        assurance || null, numero_police || null,
        source || 'dashboard',
        accompagnant_nom || null, accompagnant_tel || null, accompagnant_relation || null,
        notes || null
      ]
    );

    // Si un créneau de disponibilité est lié, le marquer comme réservé
    if (disponibilite_id) {
      await query(
        `UPDATE disponibilites SET statut='reserve' WHERE id=$1`,
        [disponibilite_id]
      ).catch(() => {});
    }

    res.status(201).json({ success: true, data: r.rows[0], message: 'RDV créé !' });
  } catch (err) {
    console.error('[POST /rendez-vous]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PUT /api/rendez-vous/:id ─────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const {
      statut, motif, heure_rdv, date_rdv,
      medecin_nom, patient_nom, notes, assurance
    } = req.body;

    const r = await query(
      `UPDATE rendez_vous
       SET statut = COALESCE($1, statut),
           motif = COALESCE($2, motif),
           heure_rdv = COALESCE($3, heure_rdv),
           date_rdv = COALESCE($4, date_rdv),
           medecin_nom = COALESCE($5, medecin_nom),
           patient_nom = COALESCE($6, patient_nom),
           notes = COALESCE($7, notes),
           assurance = COALESCE($8, assurance),
           updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [statut, motif, heure_rdv, date_rdv, medecin_nom, patient_nom, notes, assurance, req.params.id]
    );

    if (!r.rows.length) return res.status(404).json({ success: false, message: 'RDV introuvable' });

    // Si annulé, libérer le créneau
    if (statut === 'annule' && r.rows[0].disponibilite_id) {
      await query(
        `UPDATE disponibilites SET statut='disponible' WHERE id=$1`,
        [r.rows[0].disponibilite_id]
      ).catch(() => {});
    }

    res.json({ success: true, data: r.rows[0] });
  } catch (err) {
    console.error('[PUT /rendez-vous]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE /api/rendez-vous/:id ──────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const rdv = await query('SELECT disponibilite_id FROM rendez_vous WHERE id=$1', [req.params.id]);
    await query('DELETE FROM rendez_vous WHERE id=$1', [req.params.id]);

    // Libérer le créneau si lié
    if (rdv.rows[0]?.disponibilite_id) {
      await query(
        `UPDATE disponibilites SET statut='disponible' WHERE id=$1`,
        [rdv.rows[0].disponibilite_id]
      ).catch(() => {});
    }

    res.json({ success: true, message: 'RDV supprimé' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/rendez-vous/stats/resume ────────────────────────────
router.get('/stats/resume', auth, async (req, res) => {
  try {
    const cliniqueId = req.user?.clinique_id;
    if (!cliniqueId) return res.json({ success: true, data: {} });

    const r = await query(`
      SELECT
        COUNT(*) FILTER (WHERE date_rdv = CURRENT_DATE) AS rdv_aujourd_hui,
        COUNT(*) FILTER (WHERE date_rdv = CURRENT_DATE AND statut = 'confirme') AS rdv_confirmes,
        COUNT(*) FILTER (WHERE date_rdv >= date_trunc('month', CURRENT_DATE)) AS rdv_ce_mois,
        COUNT(*) FILTER (WHERE statut = 'annule' AND date_rdv >= date_trunc('month', CURRENT_DATE)) AS rdv_annules,
        COUNT(*) FILTER (WHERE statut = 'en_attente') AS en_attente
      FROM rendez_vous WHERE clinique_id = $1
    `, [cliniqueId]);

    res.json({ success: true, data: r.rows[0] || {} });
  } catch (err) {
    res.json({ success: true, data: {} });
  }
});

module.exports = router;
