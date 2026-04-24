const router   = require('express').Router();
const { query } = require('../config/db');
const { auth, authorize } = require('../middleware/auth');
const { v4: uuid } = require('uuid');

// GET /api/consultations — liste selon le rôle
router.get('/', auth, async (req, res) => {
  try {
    let sql, params;
    if (req.user.role === 'clinique') {
      // Trouver la clinique de cet utilisateur
      const cl = await query('SELECT id FROM cliniques WHERE user_id=$1', [req.user.id]);
      if (!cl.rows.length) return res.json({ success: true, data: [] });
      sql = `
        SELECT c.*, p.code_secret, u.prenom||' '||u.nom AS patient_nom,
               m.prenom||' '||m.nom AS medecin_nom
        FROM consultations c
        JOIN patients p ON p.id=c.patient_id
        JOIN utilisateurs u ON u.id=p.user_id
        LEFT JOIN medecins m ON m.id=c.medecin_id
        WHERE c.clinique_id=$1 ORDER BY c.date_consult DESC LIMIT 50`;
      params = [cl.rows[0].id];
    } else if (req.user.role === 'patient') {
      const pat = await query('SELECT id FROM patients WHERE user_id=$1', [req.user.id]);
      if (!pat.rows.length) return res.json({ success: true, data: [] });
      sql = `
        SELECT c.*, m.prenom||' '||m.nom AS medecin_nom,
               cl.nom AS clinique_nom
        FROM consultations c
        LEFT JOIN medecins m ON m.id=c.medecin_id
        LEFT JOIN cliniques cl ON cl.id=c.clinique_id
        WHERE c.patient_id=$1 ORDER BY c.date_consult DESC`;
      params = [pat.rows[0].id];
    } else {
      return res.status(403).json({ success: false, message: 'Accès non autorisé' });
    }
    const result = await query(sql, params);

    // Ajouter prescriptions et ordonnances
    const consultations = await Promise.all(result.rows.map(async (c) => {
      const presc = await query('SELECT * FROM prescriptions WHERE consultation_id=$1', [c.id]);
      const ordo  = await query('SELECT * FROM ordonnances WHERE consultation_id=$1', [c.id]);
      return { ...c, prescriptions: presc.rows, ordonnance: ordo.rows };
    }));

    res.json({ success: true, data: consultations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// GET /api/consultations/par-code/:code — accès par code secret patient
router.get('/par-code/:code', auth, async (req, res) => {
  try {
    const pat = await query('SELECT * FROM patients WHERE code_secret=$1', [req.params.code.toUpperCase()]);
    if (!pat.rows.length)
      return res.status(404).json({ success: false, message: 'Code patient non reconnu.' });

    const patient   = pat.rows[0];
    const userInfo  = await query('SELECT prenom, nom, telephone FROM utilisateurs WHERE id=$1', [patient.user_id]);
    const cons      = await query(`
      SELECT c.*, m.prenom||' '||m.nom AS medecin_nom, cl.nom AS clinique_nom
      FROM consultations c
      LEFT JOIN medecins m ON m.id=c.medecin_id
      LEFT JOIN cliniques cl ON cl.id=c.clinique_id
      WHERE c.patient_id=$1 AND c.statut='finalisee'
      ORDER BY c.date_consult DESC`, [patient.id]);

    const consultations = await Promise.all(cons.rows.map(async (c) => {
      const presc = await query('SELECT * FROM prescriptions WHERE consultation_id=$1', [c.id]);
      const ordo  = await query('SELECT * FROM ordonnances WHERE consultation_id=$1', [c.id]);
      return { ...c, prescriptions: presc.rows, ordonnance: ordo.rows };
    }));

    res.json({ success: true, patient: { ...patient, ...userInfo.rows[0] }, consultations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// POST /api/consultations — créer une consultation
router.post('/', auth, authorize('clinique'), async (req, res) => {
  const {
    patient_id, medecin_id, rdv_id, date_consult, motif,
    ta, fc, spo2, temperature, poids, taille,
    examen_clinique, diagnostic, code_cim10, note_finale,
    statut, prescriptions, ordonnance
  } = req.body;

  try {
    const cl = await query('SELECT id FROM cliniques WHERE user_id=$1', [req.user.id]);
    if (!cl.rows.length) return res.status(403).json({ success: false, message: 'Clinique introuvable' });
    const clinique_id = cl.rows[0].id;

    const consId = uuid();
    await query(`
      INSERT INTO consultations
        (id,patient_id,clinique_id,medecin_id,rdv_id,date_consult,motif,
         ta,fc,spo2,temperature,poids,taille,examen_clinique,diagnostic,code_cim10,note_finale,statut)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [consId, patient_id, clinique_id, medecin_id||null, rdv_id||null,
       date_consult||new Date().toISOString().split('T')[0],
       motif, ta||null, fc||null, spo2||null, temperature||null,
       poids||null, taille||null, examen_clinique||null,
       diagnostic, code_cim10||null, note_finale||null, statut||'brouillon']
    );

    // Prescriptions
    if (prescriptions?.length) {
      for (const p of prescriptions) {
        await query(
          'INSERT INTO prescriptions (id,consultation_id,type,label,urgent,note) VALUES ($1,$2,$3,$4,$5,$6)',
          [uuid(), consId, p.type, p.label, p.urgent||false, p.note||null]
        );
      }
    }

    // Ordonnances
    if (ordonnance?.length) {
      const pat = await query('SELECT id FROM patients WHERE id=$1', [patient_id]);
      for (const o of ordonnance) {
        await query(
          `INSERT INTO ordonnances (id,consultation_id,patient_id,medecin_id,medicament,posologie,duree,renouvellements)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [uuid(), consId, patient_id, medecin_id||null, o.med, o.posologie, o.duree||'30 jours', o.renouvellements||0]
        );
      }
    }

    // Mettre à jour RDV si fourni
    if (rdv_id) {
      await query("UPDATE rendez_vous SET statut='termine' WHERE id=$1", [rdv_id]);
    }

    res.status(201).json({ success: true, data: { id: consId }, message: 'Consultation enregistrée avec succès.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors de l\'enregistrement.' });
  }
});

// PUT /api/consultations/:id/finaliser
router.put('/:id/finaliser', auth, authorize('clinique'), async (req, res) => {
  try {
    await query("UPDATE consultations SET statut='finalisee', updated_at=NOW() WHERE id=$1", [req.params.id]);
    res.json({ success: true, message: 'Consultation finalisée et signée.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// DELETE /api/consultations/:id
router.delete('/:id', auth, authorize('clinique','admin'), async (req, res) => {
  try {
    await query('DELETE FROM consultations WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'Consultation supprimée.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur' });
  }
});

module.exports = router;
