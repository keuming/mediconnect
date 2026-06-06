const router = require('express').Router();
const { db } = require('../config/db');
const { auth, can } = require('../middleware/auth');

// GET /api/ministere/overview
router.get('/overview', auth, can('admin'), async (req, res) => {
  try {
    const a = req.query.annee || new Date().getFullYear();
    const [totC, totP, totO, totCl] = await Promise.all([
      db(`SELECT COUNT(*) c FROM consultations WHERE EXTRACT(YEAR FROM created_at)=$1`, [a]).catch(()=>({rows:[{c:0}]})),
      db(`SELECT COUNT(DISTINCT patient_id) c FROM consultations WHERE EXTRACT(YEAR FROM created_at)=$1`, [a]).catch(()=>({rows:[{c:0}]})),
      db(`SELECT COUNT(*) c FROM ordonnances WHERE EXTRACT(YEAR FROM created_at)=$1`, [a]).catch(()=>({rows:[{c:0}]})),
      db("SELECT COUNT(*) c FROM cliniques WHERE is_active IS NOT false").catch(()=>({rows:[{c:0}]})),
    ]);
    res.json({ success: true, data: {
      total_consultations: +totC.rows[0]?.c||0,
      patients_uniques:    +totP.rows[0]?.c||0,
      total_ordonnances:   +totO.rows[0]?.c||0,
      cliniques_actives:   +totCl.rows[0]?.c||0,
      annee: a,
    }});
  } catch(e) { res.json({ success: true, data: {} }); }
});

// GET /api/ministere/pathologies
router.get('/pathologies', auth, can('admin'), async (req, res) => {
  try {
    const { annee, mois, top = 20 } = req.query;
    const a = annee || new Date().getFullYear();
    const params = [a];
    let moisFilter = '';
    if (mois) { moisFilter = `AND EXTRACT(MONTH FROM created_at)=$2`; params.push(+mois); }
    params.push(+top);
    const r = await db(`
      SELECT
        COALESCE(NULLIF(TRIM(pathologie),''),
          CASE
            WHEN diagnostic ~* 'paludisme|malaria'   THEN 'Paludisme'
            WHEN diagnostic ~* 'hypertension|HTA'    THEN 'Hypertension artérielle'
            WHEN diagnostic ~* 'diabète|diabete'     THEN 'Diabète'
            WHEN diagnostic ~* 'typhoïde|typhoide'   THEN 'Fièvre typhoïde'
            WHEN diagnostic ~* 'pneumonie'            THEN 'Pneumonie'
            WHEN diagnostic ~* 'diarrhée|diarrhee'   THEN 'Diarrhée'
            WHEN diagnostic ~* 'tuberculose'          THEN 'Tuberculose'
            WHEN diagnostic ~* 'VIH|HIV|SIDA'         THEN 'VIH/SIDA'
            WHEN diagnostic ~* 'hépatite|hepatite'   THEN 'Hépatite'
            WHEN diagnostic ~* 'asthme'               THEN 'Asthme'
            WHEN diagnostic ~* 'anémie|anemie'        THEN 'Anémie'
            WHEN diagnostic ~* 'grippe|influenza'     THEN 'Grippe / IRA'
            ELSE TRIM(SPLIT_PART(diagnostic, ',', 1))
          END
        ) AS affection,
        COUNT(*) AS cas,
        COUNT(CASE WHEN sexe_patient='Masculin' THEN 1 END) AS cas_hommes,
        COUNT(CASE WHEN sexe_patient='Féminin'  THEN 1 END) AS cas_femmes,
        ROUND(AVG(age_patient)) AS age_moyen,
        EXTRACT(MONTH FROM created_at) AS mois_num
      FROM consultations
      WHERE EXTRACT(YEAR FROM created_at)=$1
        AND diagnostic IS NOT NULL AND diagnostic != ''
        ${moisFilter}
      GROUP BY affection, mois_num
      ORDER BY cas DESC
      LIMIT $${params.length}
    `, params);
    res.json({ success: true, data: r.rows });
  } catch(e) {
    console.error('[ministere/pathologies]', e.message);
    res.json({ success: true, data: [] });
  }
});

// GET /api/ministere/pathologies/evolution
router.get('/pathologies/evolution', auth, can('admin'), async (req, res) => {
  try {
    const { annee, affection } = req.query;
    const a = annee || new Date().getFullYear();
    const r = await db(`
      SELECT EXTRACT(MONTH FROM created_at) AS mois,
             TO_CHAR(DATE_TRUNC('month',created_at),'Mon YYYY') AS mois_label,
             COUNT(*) AS cas
      FROM consultations
      WHERE EXTRACT(YEAR FROM created_at)=$1
        AND (pathologie=$2 OR diagnostic ILIKE '%'||$2||'%')
      GROUP BY mois, mois_label ORDER BY mois
    `, [a, affection]);
    res.json({ success: true, data: r.rows });
  } catch(e) { res.json({ success: true, data: [] }); }
});

// GET /api/ministere/medicaments
router.get('/medicaments', auth, can('admin'), async (req, res) => {
  try {
    const { annee, mois, top = 20 } = req.query;
    const a = annee || new Date().getFullYear();
    const params = [a];
    let moisFilter = '';
    if (mois) { moisFilter = `AND EXTRACT(MONTH FROM created_at)=$2`; params.push(+mois); }
    params.push(+top);
    const r = await db(`
      SELECT
        TRIM(LOWER(SPLIT_PART(TRIM(med_item), ' ', 1))) AS medicament,
        COUNT(*) AS prescriptions
      FROM (
        SELECT UNNEST(STRING_TO_ARRAY(medicaments, ',')) AS med_item
        FROM ordonnances
        WHERE EXTRACT(YEAR FROM created_at)=$1
          AND medicaments IS NOT NULL AND medicaments != ''
          ${moisFilter}
      ) sub
      WHERE LENGTH(TRIM(med_item)) > 2
      GROUP BY medicament
      ORDER BY prescriptions DESC
      LIMIT $${params.length}
    `, params);
    res.json({ success: true, data: r.rows });
  } catch(e) {
    console.error('[ministere/medicaments]', e.message);
    res.json({ success: true, data: [] });
  }
});

// GET /api/ministere/epidemio-mensuelle
router.get('/epidemio-mensuelle', auth, can('admin'), async (req, res) => {
  try {
    const a = req.query.annee || new Date().getFullYear();
    const r = await db(`
      SELECT EXTRACT(MONTH FROM created_at) AS mois,
             COUNT(*) AS total_consultations,
             COUNT(DISTINCT patient_id) AS patients_uniques,
             COUNT(CASE WHEN gravite='grave' THEN 1 END) AS cas_graves
      FROM consultations
      WHERE EXTRACT(YEAR FROM created_at)=$1 AND diagnostic IS NOT NULL
      GROUP BY mois ORDER BY mois
    `, [a]);
    const moisFr = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
    const result = Array.from({length:12}, (_, i) => {
      const found = r.rows.find(row => +row.mois === i+1);
      return {
        mois: i+1, mois_label: moisFr[i],
        total_consultations: +(found?.total_consultations||0),
        patients_uniques:    +(found?.patients_uniques||0),
        cas_graves:          +(found?.cas_graves||0),
      };
    });
    res.json({ success: true, data: result });
  } catch(e) { res.json({ success: true, data: [] }); }
});

// GET /api/ministere/demographics
router.get('/demographics', auth, can('admin'), async (req, res) => {
  try {
    const a = req.query.annee || new Date().getFullYear();
    const r = await db(`
      SELECT
        CASE WHEN age_patient < 5  THEN '0-4 ans'
             WHEN age_patient < 15 THEN '5-14 ans'
             WHEN age_patient < 25 THEN '15-24 ans'
             WHEN age_patient < 40 THEN '25-39 ans'
             WHEN age_patient < 60 THEN '40-59 ans'
             ELSE '60 ans et +' END AS tranche_age,
        COUNT(*) AS total,
        COUNT(CASE WHEN sexe_patient='Masculin' THEN 1 END) AS hommes,
        COUNT(CASE WHEN sexe_patient='Féminin'  THEN 1 END) AS femmes
      FROM consultations
      WHERE EXTRACT(YEAR FROM created_at)=$1 AND age_patient IS NOT NULL
      GROUP BY tranche_age ORDER BY MIN(age_patient)
    `, [a]);
    res.json({ success: true, data: r.rows });
  } catch(e) { res.json({ success: true, data: [] }); }
});

// GET /api/ministere/geo-morbidite
router.get('/geo-morbidite', auth, can('admin'), async (req, res) => {
  try {
    const a = req.query.annee || new Date().getFullYear();
    const r = await db(`
      SELECT COALESCE(c.ville, cl.ville, 'Non précisé') AS ville,
             COUNT(*) AS cas, COUNT(DISTINCT c.patient_id) AS patients
      FROM consultations c LEFT JOIN cliniques cl ON cl.id=c.clinique_id
      WHERE EXTRACT(YEAR FROM c.created_at)=$1
        AND COALESCE(c.ville, cl.ville) IS NOT NULL
      GROUP BY ville ORDER BY cas DESC LIMIT 15
    `, [a]);
    res.json({ success: true, data: r.rows });
  } catch(e) { res.json({ success: true, data: [] }); }
});

module.exports = router;
