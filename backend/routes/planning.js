// routes/planning.js — API Planning Médecin (synchronisation centrale)
const router = require('express').Router();
const { query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { v4: uuid } = require('uuid');

// ═══════════════════════════════════════════════════════════════
//  PROFIL MÉDECIN
// ═══════════════════════════════════════════════════════════════

// GET /api/medecins/mon-profil
router.get('/mon-profil', authenticate, authorize('medecin'), async (req, res) => {
  try {
    const r = await query(
      `SELECT m.*, u.prenom, u.nom, u.email, u.telephone, u.ville
       FROM medecins m
       JOIN utilisateurs u ON u.id = m.user_id
       WHERE u.id = $1`,
      [req.user.id]
    );
    if (!r.rows[0]) return res.status(404).json({ success: false, message: 'Profil introuvable' });
    res.json({ success: true, data: r.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/medecins/mon-profil
router.put('/mon-profil', authenticate, authorize('medecin'), async (req, res) => {
  try {
    const { specialite, tarif, experience_ans, horaires_debut, horaires_fin, jours_travail, bio } = req.body;
    const medecin = await query('SELECT id FROM medecins WHERE user_id = $1', [req.user.id]);
    if (!medecin.rows[0]) return res.status(404).json({ success: false, message: 'Médecin introuvable' });
    await query(
      `UPDATE medecins SET specialite=$1, tarif=$2, experience_ans=$3,
       horaires_debut=$4, horaires_fin=$5, jours_travail=$6, bio=$7
       WHERE user_id=$8`,
      [specialite, tarif, experience_ans, horaires_debut, horaires_fin,
       JSON.stringify(jours_travail), bio, req.user.id]
    );
    res.json({ success: true, message: 'Profil mis à jour' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
//  CLINIQUES AFFILIÉES
// ═══════════════════════════════════════════════════════════════

// GET /api/medecins/mes-cliniques
router.get('/mes-cliniques', authenticate, authorize('medecin'), async (req, res) => {
  try {
    const medecin = await query('SELECT id FROM medecins WHERE user_id = $1', [req.user.id]);
    if (!medecin.rows[0]) return res.json({ success: true, data: [] });

    const r = await query(
      `SELECT c.id, c.nom, c.type, u.ville, u.adresse, u.telephone
       FROM cliniques c
       JOIN utilisateurs u ON u.id = c.user_id
       JOIN medecins m ON m.clinique_id = c.id
       WHERE m.user_id = $1 AND m.statut IN ('Disponible','En service')
       ORDER BY c.nom`,
      [req.user.id]
    );
    res.json({ success: true, data: r.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
//  DISPONIBILITÉS — Lecture
// ═══════════════════════════════════════════════════════════════

// GET /api/medecins/mes-disponibilites?annee=&mois=&clinique_id=
router.get('/mes-disponibilites', authenticate, authorize('medecin'), async (req, res) => {
  try {
    const { annee, mois, clinique_id } = req.query;
    const medecin = await query('SELECT id FROM medecins WHERE user_id = $1', [req.user.id]);
    if (!medecin.rows[0]) return res.json({ success: true, data: [] });
    const medecin_id = medecin.rows[0].id;

    let sql = `
      SELECT d.id, d.date, d.heure_debut, d.heure_fin, d.type, d.recurrent,
             c.nom as clinique_nom,
             u.prenom || ' ' || u.nom as patient_nom
      FROM disponibilites_medecins d
      LEFT JOIN rendez_vous rv ON rv.medecin_id = d.medecin_id
        AND rv.date_rdv = d.date AND rv.heure_rdv = d.heure_debut
        AND rv.statut NOT IN ('annule')
      LEFT JOIN patients p ON p.id = rv.patient_id
      LEFT JOIN utilisateurs u ON u.id = p.user_id
      LEFT JOIN cliniques c ON c.id = d.clinique_id
      WHERE d.medecin_id = $1
    `;
    const params = [medecin_id];

    if (annee && mois) {
      sql += ` AND EXTRACT(YEAR FROM d.date) = $${params.length+1} AND EXTRACT(MONTH FROM d.date) = $${params.length+2}`;
      params.push(annee, mois);
    }
    if (clinique_id) {
      sql += ` AND d.clinique_id = $${params.length+1}`;
      params.push(clinique_id);
    }
    sql += ' ORDER BY d.date, d.heure_debut';

    const r = await query(sql, params);
    res.json({ success: true, data: r.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
//  DISPONIBILITÉS — Ajout
// ═══════════════════════════════════════════════════════════════

// POST /api/medecins/disponibilites
router.post('/disponibilites', authenticate, authorize('medecin'), async (req, res) => {
  try {
    const { clinique_id, date, heure_debut, heure_fin, type = 'disponible', recurrent, jours_recurrence } = req.body;
    if (!clinique_id || !date || !heure_debut || !heure_fin) {
      return res.status(400).json({ success: false, message: 'Clinique, date, heure début et fin requis' });
    }

    const medecin = await query('SELECT id FROM medecins WHERE user_id = $1', [req.user.id]);
    if (!medecin.rows[0]) return res.status(404).json({ success: false, message: 'Médecin introuvable' });
    const medecin_id = medecin.rows[0].id;

    // Vérifier conflit
    const conflit = await query(
      `SELECT id FROM disponibilites_medecins
       WHERE medecin_id = $1 AND clinique_id = $2 AND date = $3
       AND NOT (heure_fin <= $4 OR heure_debut >= $5)`,
      [medecin_id, clinique_id, date, heure_debut, heure_fin]
    );
    if (conflit.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Conflit horaire avec un créneau existant' });
    }

    // Insérer le créneau principal
    const id = uuid();
    await query(
      `INSERT INTO disponibilites_medecins (id, medecin_id, clinique_id, date, heure_debut, heure_fin, type, recurrent, jours_recurrence)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, medecin_id, clinique_id, date, heure_debut, heure_fin, type, recurrent || false,
       JSON.stringify(jours_recurrence || [])]
    );

    // Si récurrent, générer les créneaux pour les 8 prochaines semaines
    if (recurrent && jours_recurrence && jours_recurrence.length > 0) {
      const inserts = [];
      const dateRef = new Date(date);
      for (let semaine = 1; semaine <= 8; semaine++) {
        for (const jourIdx of jours_recurrence) {
          const d = new Date(dateRef);
          d.setDate(d.getDate() + semaine * 7 + (jourIdx - dateRef.getDay() + 7) % 7);
          const ds = d.toISOString().split('T')[0];
          inserts.push(
            query(
              `INSERT INTO disponibilites_medecins (id, medecin_id, clinique_id, date, heure_debut, heure_fin, type, recurrent, jours_recurrence, parent_id)
               VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9)
               ON CONFLICT DO NOTHING`,
              [uuid(), medecin_id, clinique_id, ds, heure_debut, heure_fin, type,
               JSON.stringify(jours_recurrence), id]
            )
          );
        }
      }
      await Promise.all(inserts);
    }

    res.status(201).json({ success: true, data: { id }, message: 'Créneau publié et synchronisé' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/medecins/disponibilites/:id
router.delete('/disponibilites/:id', authenticate, authorize('medecin'), async (req, res) => {
  try {
    const medecin = await query('SELECT id FROM medecins WHERE user_id = $1', [req.user.id]);
    if (!medecin.rows[0]) return res.status(404).json({ success: false, message: 'Médecin introuvable' });

    await query(
      'DELETE FROM disponibilites_medecins WHERE id = $1 AND medecin_id = $2',
      [req.params.id, medecin.rows[0].id]
    );
    res.json({ success: true, message: 'Créneau supprimé' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
//  DISPONIBILITÉS PUBLIQUES — Pour le site RDV et patients
// ═══════════════════════════════════════════════════════════════

// GET /api/public/medecins/:id/disponibilites (sans auth)
router.get('/public/:medecin_id/disponibilites', async (req, res) => {
  try {
    const r = await query(
      `SELECT d.date, d.heure_debut, d.heure_fin, d.type, c.nom as clinique_nom, c.id as clinique_id
       FROM disponibilites_medecins d
       JOIN cliniques c ON c.id = d.clinique_id
       LEFT JOIN rendez_vous rv ON rv.medecin_id = d.medecin_id
         AND rv.date_rdv = d.date AND rv.heure_rdv = d.heure_debut
         AND rv.statut NOT IN ('annule')
       WHERE d.medecin_id = $1 AND d.type = 'disponible'
         AND rv.id IS NULL
         AND d.date >= CURRENT_DATE AND d.date <= CURRENT_DATE + INTERVAL '30 days'
       ORDER BY d.date, d.heure_debut
       LIMIT 60`,
      [req.params.medecin_id]
    );
    const slots = r.rows.map(row => ({
      creneau: `${row.date} ${row.heure_debut.slice(0,5)}`,
      date: row.date,
      heure: row.heure_debut.slice(0,5),
      clinique: row.clinique_nom,
      clinique_id: row.clinique_id,
    }));
    res.json({ success: true, data: slots });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
//  RDV DU MÉDECIN
// ═══════════════════════════════════════════════════════════════

// GET /api/medecins/mes-rdvs
router.get('/mes-rdvs', authenticate, authorize('medecin'), async (req, res) => {
  try {
    const medecin = await query('SELECT id FROM medecins WHERE user_id = $1', [req.user.id]);
    if (!medecin.rows[0]) return res.json({ success: true, data: [] });

    const r = await query(
      `SELECT rv.id, rv.date_rdv, rv.heure_rdv, rv.motif, rv.statut,
              u.prenom as patient_prenom, u.nom as patient_nom,
              c.nom as clinique_nom
       FROM rendez_vous rv
       JOIN patients p ON p.id = rv.patient_id
       JOIN utilisateurs u ON u.id = p.user_id
       LEFT JOIN cliniques c ON c.id = rv.clinique_id
       WHERE rv.medecin_id = $1
       ORDER BY rv.date_rdv DESC, rv.heure_rdv
       LIMIT 50`,
      [medecin.rows[0].id]
    );
    res.json({ success: true, data: r.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
//  PATIENTS DU MÉDECIN
// ═══════════════════════════════════════════════════════════════

// GET /api/medecins/mes-patients
router.get('/mes-patients', authenticate, authorize('medecin'), async (req, res) => {
  try {
    const medecin = await query('SELECT id FROM medecins WHERE user_id = $1', [req.user.id]);
    if (!medecin.rows[0]) return res.json({ success: true, data: [] });

    const r = await query(
      `SELECT DISTINCT p.id, p.code_secret, p.groupe_sanguin, p.allergies, p.antecedents,
              u.prenom, u.nom, u.telephone, u.email, u.date_naissance,
              c.id as clinique_id,
              (SELECT json_agg(json_build_object(
                 'id', co.id, 'date', co.date_consultation, 'motif', co.motif,
                 'diagnostic', co.diagnostic, 'traitement', co.traitement,
                 'notes', co.notes, 'ordonnance', co.ordonnance,
                 'clinique_nom', cl.nom
               ) ORDER BY co.date_consultation DESC)
               FROM consultations co
               LEFT JOIN cliniques cl ON cl.id = co.clinique_id
               WHERE co.patient_id = p.id AND co.medecin_id = $1
              ) as consultations
       FROM rendez_vous rv
       JOIN patients p ON p.id = rv.patient_id
       JOIN utilisateurs u ON u.id = p.user_id
       LEFT JOIN cliniques c ON c.id = rv.clinique_id
       WHERE rv.medecin_id = $1
       ORDER BY u.nom`,
      [medecin.rows[0].id]
    );
    res.json({ success: true, data: r.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
//  STATISTIQUES MÉDECIN
// ═══════════════════════════════════════════════════════════════

// GET /api/medecins/mes-stats
router.get('/mes-stats', authenticate, authorize('medecin'), async (req, res) => {
  try {
    const medecin = await query('SELECT id FROM medecins WHERE user_id = $1', [req.user.id]);
    if (!medecin.rows[0]) return res.json({ success: true, data: {} });
    const mid = medecin.rows[0].id;

    const [consultsMois, patientsTotal, rdvsConfirmes, rdvsTotal] = await Promise.all([
      query(`SELECT COUNT(*) FROM consultations WHERE medecin_id = $1 AND EXTRACT(MONTH FROM date_consultation) = EXTRACT(MONTH FROM NOW()) AND EXTRACT(YEAR FROM date_consultation) = EXTRACT(YEAR FROM NOW())`, [mid]),
      query(`SELECT COUNT(DISTINCT patient_id) FROM rendez_vous WHERE medecin_id = $1`, [mid]),
      query(`SELECT COUNT(*) FROM rendez_vous WHERE medecin_id = $1 AND statut = 'confirme'`, [mid]),
      query(`SELECT COUNT(*) FROM rendez_vous WHERE medecin_id = $1`, [mid]),
    ]);

    const total = parseInt(rdvsTotal.rows[0].count) || 0;
    const confirmes = parseInt(rdvsConfirmes.rows[0].count) || 0;

    res.json({
      success: true,
      data: {
        consultations_mois: parseInt(consultsMois.rows[0].count) || 0,
        patients_total:     parseInt(patientsTotal.rows[0].count) || 0,
        rdvs_confirmes:     confirmes,
        taux_presence:      total > 0 ? Math.round(confirmes / total * 100) : 0,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
