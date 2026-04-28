const router = require('express').Router();
const { query } = require('../config/db');
const { v4: uuid } = require('uuid');

// ── GET /api/public/cliniques ─────────────────────────────────────
// Liste des cliniques avec leurs spécialités
router.get('/cliniques', async (req, res) => {
  try {
    const { ville, specialite } = req.query;
    let sql = `
      SELECT c.id, c.nom, c.type, c.assurances,
             u.ville, u.quartier, u.adresse, u.telephone,
             ARRAY_AGG(DISTINCT m.specialite) FILTER (WHERE m.specialite IS NOT NULL) AS specialites,
             COUNT(DISTINCT m.id) AS nb_medecins
      FROM cliniques c
      JOIN utilisateurs u ON u.id = c.user_id
      LEFT JOIN medecins m ON m.clinique_id = c.id AND m.statut = 'Disponible'
      WHERE u.is_active = true
    `;
    const params = [];
    if (ville) { sql += ` AND LOWER(u.ville) = LOWER($${params.length+1})`; params.push(ville); }
    sql += ` GROUP BY c.id, c.nom, c.type, c.assurances, u.ville, u.quartier, u.adresse, u.telephone`;
    if (specialite) sql += ` HAVING ARRAY_AGG(DISTINCT m.specialite) @> ARRAY[$${params.length+1}]` && params.push(specialite);
    sql += ` ORDER BY c.nom`;
    const r = await query(sql, params);
    res.json({ success: true, data: r.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// ── GET /api/public/cliniques/:id/medecins ────────────────────────
// Médecins d'une clinique avec leurs disponibilités
router.get('/cliniques/:id/medecins', async (req, res) => {
  try {
    const { specialite } = req.query;
    let sql = `
      SELECT m.id, m.prenom, m.nom, m.specialite, m.tarif,
             m.experience_ans, m.horaires_debut, m.horaires_fin, m.jours_travail,
             m.statut, m.photo_url
      FROM medecins m
      WHERE m.clinique_id = $1 AND m.statut = 'Disponible'
    `;
    const params = [req.params.id];
    if (specialite) { sql += ` AND m.specialite = $2`; params.push(specialite); }
    sql += ` ORDER BY m.nom`;
    const r = await query(sql, params);
    res.json({ success: true, data: r.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// ── GET /api/public/medecins/:id/disponibilites ───────────────────
// Créneaux disponibles d'un médecin (prochains 30 jours)
router.get('/medecins/:id/disponibilites', async (req, res) => {
  try {
    // Récupérer les RDV déjà pris pour ce médecin
    const rdvsPris = await query(
      `SELECT date_rdv::text, heure_rdv::text FROM rendez_vous
       WHERE medecin_id=$1 AND statut NOT IN ('annule','termine')
       AND date_rdv >= CURRENT_DATE AND date_rdv <= CURRENT_DATE + INTERVAL '30 days'`,
      [req.params.id]
    );

    // Récupérer les horaires du médecin
    const medResult = await query(
      'SELECT horaires_debut, horaires_fin, jours_travail FROM medecins WHERE id=$1',
      [req.params.id]
    );
    if (!medResult.rows.length) return res.json({ success: true, data: [] });

    const { horaires_debut, horaires_fin, jours_travail } = medResult.rows[0];
    const prisSet = new Set(rdvsPris.rows.map(r => `${r.date_rdv} ${r.heure_rdv.slice(0,5)}`));

    // Générer les créneaux disponibles (30 prochains jours, tranches de 30 min)
    const disponibilites = [];
    const joursFr = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
    const joursActifs = jours_travail || ['Lundi','Mardi','Mercredi','Jeudi','Vendredi'];

    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i + 1);
      const jourNom = joursFr[date.getDay()];
      if (!joursActifs.includes(jourNom)) continue;

      const dateStr = date.toISOString().split('T')[0];
      const [hDeb] = (horaires_debut || '08:00').split(':').map(Number);
      const [hFin] = (horaires_fin  || '17:00').split(':').map(Number);

      for (let h = hDeb; h < hFin; h++) {
        for (const min of ['00', '30']) {
          const heure = `${String(h).padStart(2,'0')}:${min}`;
          const key = `${dateStr} ${heure}`;
          if (!prisSet.has(key)) disponibilites.push(key);
        }
      }
    }

    res.json({ success: true, data: disponibilites.slice(0, 60) }); // Max 60 créneaux
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur' });
  }
});

// ── POST /api/public/rdv ──────────────────────────────────────────
// Créer un RDV depuis le site public
router.post('/rdv', async (req, res) => {
  const {
    clinique_id, medecin_id, date_rdv, heure_rdv, motif, assurance,
    patient_prenom, patient_nom, patient_telephone, patient_email,
    patient_ville, numero_police, statut_patient,
    accompagnant_prenom, accompagnant_nom, accompagnant_telephone, accompagnant_relation
  } = req.body;

  if (!clinique_id || !medecin_id || !date_rdv || !heure_rdv) {
    return res.status(400).json({ success: false, message: 'Clinique, médecin, date et heure requis.' });
  }
  if (!patient_prenom || !patient_nom || !patient_telephone) {
    return res.status(400).json({ success: false, message: 'Prénom, nom et téléphone du patient requis.' });
  }

  try {
    // Vérifier que le créneau est disponible
    const check = await query(
      `SELECT id FROM rendez_vous WHERE medecin_id=$1 AND date_rdv=$2 AND heure_rdv=$3 AND statut NOT IN ('annule','termine')`,
      [medecin_id, date_rdv, heure_rdv]
    );
    if (check.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Ce créneau n\'est plus disponible. Choisissez un autre.' });
    }

    // Chercher ou créer le patient
    let patient_user_id = null;
    const existingUser = await query(
      'SELECT id FROM utilisateurs WHERE telephone=$1 OR email=$2 LIMIT 1',
      [patient_telephone, patient_email || 'noemail@x.x']
    );

    if (existingUser.rows.length > 0) {
      patient_user_id = existingUser.rows[0].id;
    } else {
      // Créer le compte patient temporaire
      const newUserId = uuid();
      await query(
        `INSERT INTO utilisateurs (id,email,password,role,prenom,nom,telephone,ville)
         VALUES ($1,$2,'public_rdv','patient',$3,$4,$5,$6)`,
        [newUserId, patient_email || `rdv_${Date.now()}@mediconnect.ci`, patient_prenom, patient_nom, patient_telephone, patient_ville || '']
      );
      const code = `MC-${(patient_prenom[0]+patient_nom[0]).toUpperCase()}-${Math.floor(1000+Math.random()*9000)}`;
      await query(
        `INSERT INTO patients (id,user_id,code_secret) VALUES ($1,$2,$3)`,
        [uuid(), newUserId, code]
      );
      patient_user_id = newUserId;
    }

    // Récupérer l'id patient
    const patResult = await query('SELECT id, code_secret FROM patients WHERE user_id=$1', [patient_user_id]);
    const patient_id = patResult.rows[0]?.id;
    const code_secret = patResult.rows[0]?.code_secret;

    // Générer la référence RDV
    const reference = 'MC-RDV-' + Math.random().toString(36).slice(2,8).toUpperCase();

    // Créer le RDV
    const rdvId = uuid();
    await query(
      `INSERT INTO rendez_vous (id,reference,patient_id,clinique_id,medecin_id,date_rdv,heure_rdv,motif,assurance,statut,source,accompagnant_nom,accompagnant_tel,accompagnant_relation)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'en_attente','public_rdv',$10,$11,$12)`,
      [rdvId, reference, patient_id, clinique_id, medecin_id, date_rdv, heure_rdv, motif || '', assurance || null,
       accompagnant_prenom ? `${accompagnant_prenom} ${accompagnant_nom}` : null,
       accompagnant_telephone || null, accompagnant_relation || null]
    );

    // TODO: Envoyer SMS/email de confirmation (intégration future)

    res.status(201).json({
      success: true,
      data: { reference, rdv_id: rdvId, code_secret, patient_id },
      message: `RDV confirmé ! Référence : ${reference}`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur lors de la réservation.' });
  }
});

module.exports = router;
