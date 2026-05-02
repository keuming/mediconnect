const router = require('express').Router();
const { query } = require('../config/db');
const { auth, authorize } = require('../middleware/auth');
const { v4: uuid } = require('uuid');

// GET /api/rdv — tous les RDV (admin)
router.get('/', auth, async (req, res) => {
  try {
    const result = await query(
      `SELECT r.id, r.reference, r.date_rdv as date, r.heure_rdv as heure,
              r.statut, r.motif, r.creneau,
              r.clinique_id, r.medecin_id,
              c.nom as clinique_nom,
              m.prenom as medecin_prenom, m.nom as medecin_nom, m.specialite,
              pu.prenom as patient_prenom, pu.nom as patient_nom
       FROM rendez_vous r
       LEFT JOIN cliniques c ON c.id = r.clinique_id
       LEFT JOIN medecins m ON m.id = r.medecin_id
       LEFT JOIN patients p ON p.id = r.patient_id
       LEFT JOIN utilisateurs pu ON pu.id = p.user_id
       ORDER BY r.created_at DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Erreur rdv:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/rdv — créer un RDV (depuis rdv-site)
router.post('/', async (req, res) => {
  const { clinique_id, medecin_id, patient, specialite, creneau, motif, reference, code_secret } = req.body;
  try {
    const rdvId = uuid();
    const ref = reference || `MC-RDV-${Date.now()}`;

    // Chercher ou créer le patient
    let patientId = null;
    if (patient?.telephone) {
      const existing = await query(
        `SELECT p.id FROM patients p JOIN utilisateurs u ON u.id=p.user_id WHERE u.telephone=$1`,
        [patient.telephone]
      );
      if (existing.rows.length) {
        patientId = existing.rows[0].id;
      } else {
        // Créer un utilisateur temporaire
        const userId = uuid();
        await query(
          `INSERT INTO utilisateurs (id,email,password,role,prenom,nom,telephone,pays_code)
           VALUES ($1,$2,$3,'patient',$4,$5,$6,'CI')`,
          [userId, patient.email || `${userId}@rdv.temp`, 'TEMP', patient.prenom, patient.nom, patient.telephone]
        );
        const code = `MC-${(patient.prenom[0]+patient.nom[0]).toUpperCase()}-${Math.floor(1000+Math.random()*9000)}`;
        const p = await query(
          `INSERT INTO patients (user_id,code_secret,sexe) VALUES ($1,$2,$3) RETURNING id`,
          [userId, code_secret || code, patient.sexe || null]
        );
        patientId = p.rows[0].id;
      }
    }

    const [datePart, timePart] = (creneau || '').split(' ');

    await query(
      `INSERT INTO rendez_vous (id, clinique_id, medecin_id, patient_id, date_rdv, heure_rdv, statut, motif, reference, creneau)
       VALUES ($1,$2,$3,$4,$5,$6,'en_attente',$7,$8,$9)`,
      [rdvId, clinique_id || null, medecin_id || null, patientId, datePart || null, timePart || null, motif || '', ref, creneau || null]
    );

    res.status(201).json({ success: true, data: { id: rdvId, reference: ref }, message: 'RDV créé avec succès' });
  } catch (err) {
    console.error('Erreur création RDV:', err);
    res.status(500).json({ success: false, message: 'Erreur lors de la création du RDV' });
  }
});

// PUT /api/rdv/:id/statut
router.put('/:id/statut', auth, async (req, res) => {
  try {
    const { statut } = req.body;
    await query(`UPDATE rendez_vous SET statut=$1 WHERE id=$2`, [statut, req.params.id]);
    res.json({ success: true, message: 'Statut mis à jour' });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

module.exports = router;
