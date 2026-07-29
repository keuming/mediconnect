const router = require('express').Router();
const { db } = require('../config/db');
const { auth } = require('../middleware/auth');

// GET /api/planning/stats
router.get('/stats', auth, async (req, res) => {
  try {
    const mid   = req.user?.medecin_id || req.user?.id;
    const today = new Date().toISOString().split('T')[0];
    const [rdvJ, rdvM, cons, dispo] = await Promise.all([
      db("SELECT COUNT(*) c FROM rendez_vous WHERE medecin_id=$1 AND date_rdv=$2 AND statut NOT IN ('annule')", [mid, today]).catch(()=>({rows:[{c:0}]})),
      db("SELECT COUNT(*) c FROM rendez_vous WHERE medecin_id=$1 AND date_rdv>=date_trunc('month',CURRENT_DATE) AND statut NOT IN ('annule')", [mid]).catch(()=>({rows:[{c:0}]})),
      db("SELECT COUNT(*) c FROM consultations WHERE medecin_id=$1", [mid]).catch(()=>({rows:[{c:0}]})),
      db("SELECT COUNT(*) c FROM disponibilites WHERE medecin_id=$1 AND statut='disponible' AND date>=CURRENT_DATE", [mid]).catch(()=>({rows:[{c:0}]})),
    ]);
    res.json({ success: true, data: {
      rdv_aujourd_hui:      +rdvJ.rows[0]?.c || 0,
      rdv_ce_mois:          +rdvM.rows[0]?.c || 0,
      consultations_total:  +cons.rows[0]?.c || 0,
      creneaux_disponibles: +dispo.rows[0]?.c|| 0,
    }});
  } catch(e) { res.json({ success: true, data: { rdv_aujourd_hui:0, rdv_ce_mois:0, consultations_total:0, creneaux_disponibles:0 } }); }
});

// GET /api/planning/rdvs
router.get('/rdvs', auth, async (req, res) => {
  try {
    const { date, statut } = req.query;
    const mid = req.user?.medecin_id || req.user?.id;
    let sql = 'SELECT * FROM rendez_vous WHERE medecin_id=$1'; const p = [mid];
    if (date)   { p.push(date);   sql += ` AND date_rdv=$${p.length}`; }
    if (statut) { p.push(statut); sql += ` AND statut=$${p.length}`; }
    sql += ' ORDER BY date_rdv, heure_rdv LIMIT 100';
    const r = await db(sql, p);
    res.json({ success: true, data: r.rows });
  } catch(e) { res.json({ success: true, data: [] }); }
});

// GET /api/planning/disponibilites
router.get('/disponibilites', auth, async (req, res) => {
  try {
    const { mois, annee } = req.query;
    const mid = req.user?.medecin_id || req.user?.id;
    const m = mois  || new Date().getMonth() + 1;
    const a = annee || new Date().getFullYear();
    const r = await db(`
      SELECT d.*, rdv.patient_nom, rdv.motif AS rdv_motif, rdv.statut AS rdv_statut, rdv.id AS rdv_id
      FROM disponibilites d
      LEFT JOIN rendez_vous rdv
        ON rdv.medecin_id=d.medecin_id AND rdv.date_rdv=d.date AND rdv.heure_rdv=d.heure_debut
        AND rdv.statut NOT IN ('annule')
      WHERE d.medecin_id=$1
        AND EXTRACT(MONTH FROM d.date)=$2
        AND EXTRACT(YEAR  FROM d.date)=$3
      ORDER BY d.date, d.heure_debut
    `, [mid, m, a]);
    res.json({ success: true, data: r.rows });
  } catch(e) { res.json({ success: true, data: [] }); }
});

// POST /api/planning/disponibilites
router.post('/disponibilites', auth, async (req, res) => {
  try {
    const { date, heure_debut, heure_fin, clinique_id, recurrent } = req.body;
    if (!date || !heure_debut || !heure_fin)
      return res.status(400).json({ success: false, message: 'date, heure_debut et heure_fin requis' });
    const mid = req.user?.medecin_id || req.user?.id;
    const exists = await db(
      'SELECT id FROM disponibilites WHERE medecin_id=$1 AND date=$2 AND heure_debut=$3',
      [mid, date, heure_debut]
    );
    if (exists.rows.length)
      return res.status(409).json({ success: false, message: 'Créneau déjà existant' });
    const r = await db(
      'INSERT INTO disponibilites (id,medecin_id,clinique_id,date,heure_debut,heure_fin,recurrent) VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6) RETURNING *',
      [mid, clinique_id||null, date, heure_debut, heure_fin, recurrent||false]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// DELETE /api/planning/disponibilites/:id
router.delete('/disponibilites/:id', auth, async (req, res) => {
  try {
    await db('DELETE FROM disponibilites WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET /api/planning/mes-patients
router.get('/mes-patients', auth, async (req, res) => {
  try {
    const mid = req.user?.medecin_id || req.user?.id;
    const r = await db(`
      SELECT DISTINCT p.* FROM patients p
      WHERE p.id IN (
        SELECT DISTINCT c.patient_id FROM consultations c WHERE c.medecin_id=$1 AND c.patient_id IS NOT NULL
        UNION
        SELECT DISTINCT rv.patient_id FROM rendez_vous rv WHERE rv.medecin_id=$1 AND rv.patient_id IS NOT NULL
      )
      ORDER BY p.nom, p.prenom
    `, [mid]);
    res.json({ success: true, data: r.rows });
  } catch(e) { res.json({ success: true, data: [] }); }
});

// GET /api/planning/mes-cliniques
router.get('/mes-cliniques', auth, async (req, res) => {
  try {
    const r = await db('SELECT id, nom, ville, telephone FROM cliniques WHERE is_active IS NOT false ORDER BY nom LIMIT 20');
    res.json({ success: true, data: r.rows });
  } catch(e) { res.json({ success: true, data: [] }); }
});


// ── GET /api/planning/public/disponibilites ───────────────────────
// Route publique — patient voit les créneaux disponibles d'une clinique
router.get('/public/disponibilites', async (req, res) => {
  try {
    const { clinique_id, medecin_id, date_debut, date_fin } = req.query;
    if (!clinique_id && !medecin_id)
      return res.status(400).json({ success:false, message:'clinique_id ou medecin_id requis' });

    const debut = date_debut || new Date().toISOString().split('T')[0];
    const fin   = date_fin   || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0];

    let where = "d.date >= $1 AND d.date <= $2 AND d.statut='disponible'";
    const params = [debut, fin];
    let idx = 3;

    if (clinique_id) { where += ` AND d.clinique_id=$${idx++}`; params.push(clinique_id); }
    if (medecin_id)  { where += ` AND d.medecin_id=$${idx++}`; params.push(medecin_id); }

    const r = await db(`
      SELECT
        d.id, d.date, d.heure_debut, d.heure_fin, d.statut, d.recurrent,
        d.medecin_id, d.clinique_id,
        m.prenom as medecin_prenom, m.nom as medecin_nom, m.specialite,
        c.nom as clinique_nom, c.adresse as clinique_adresse, c.ville as clinique_ville,
        CASE WHEN rv.id IS NOT NULL THEN true ELSE false END as est_reserve
      FROM disponibilites d
      LEFT JOIN medecins m ON m.id = d.medecin_id
      LEFT JOIN cliniques c ON c.id = d.clinique_id
      LEFT JOIN rendez_vous rv
        ON rv.medecin_id = d.medecin_id
        AND rv.date_rdv = d.date
        AND rv.heure_rdv = d.heure_debut
        AND rv.statut NOT IN ('annule')
      WHERE ${where}
      ORDER BY d.date ASC, d.heure_debut ASC
      LIMIT 200
    `, params);

    // Grouper par date pour faciliter l'affichage calendrier
    const byDate = {};
    r.rows.forEach(slot => {
      const key = slot.date.toISOString ? slot.date.toISOString().split('T')[0] : slot.date;
      if (!byDate[key]) byDate[key] = [];
      byDate[key].push(slot);
    });

    res.json({
      success: true,
      data: r.rows,
      by_date: byDate,
      total: r.rows.length
    });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── GET /api/planning/public/semaine ─────────────────────────────
// Disponibilités de la semaine courante par clinique
router.get('/public/semaine', async (req, res) => {
  try {
    const { clinique_id } = req.query;
    if (!clinique_id) return res.status(400).json({ success:false, message:'clinique_id requis' });

    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const debut = monday.toISOString().split('T')[0];
    const fin   = sunday.toISOString().split('T')[0];

    const r = await db(`
      SELECT
        d.id, d.date, d.heure_debut, d.heure_fin, d.statut,
        d.medecin_id, d.clinique_id,
        m.prenom as medecin_prenom, m.nom as medecin_nom, m.specialite,
        CASE WHEN rv.id IS NOT NULL THEN true ELSE false END as est_reserve
      FROM disponibilites d
      LEFT JOIN medecins m ON m.id = d.medecin_id
      LEFT JOIN rendez_vous rv
        ON rv.medecin_id = d.medecin_id
        AND rv.date_rdv = d.date
        AND rv.heure_rdv = d.heure_debut
        AND rv.statut NOT IN ('annule')
      WHERE d.clinique_id=$1
        AND d.date >= $2 AND d.date <= $3
        AND d.statut='disponible'
      ORDER BY d.date, d.heure_debut
    `, [clinique_id, debut, fin]);

    // Dédupliquer par medecin_id + date + heure_debut
    const seen = new Set();
    const unique = r.rows.filter(slot => {
      const key = `${slot.medecin_id}-${slot.date}-${slot.heure_debut}`;
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });

    const jours = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
    const semaine = {};
    for (let i=0; i<7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate()+i);
      const key = d.toISOString().split('T')[0];
      semaine[key] = { jour:jours[i], date:key, creneaux:[] };
    }
    unique.forEach(slot => {
      const key = slot.date.toISOString ? slot.date.toISOString().split('T')[0] : slot.date;
      if (semaine[key] && (slot.medecin_nom || slot.medecin_prenom)) semaine[key].creneaux.push(slot);
    });

    res.json({ success:true, semaine: Object.values(semaine) });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

module.exports = router;
