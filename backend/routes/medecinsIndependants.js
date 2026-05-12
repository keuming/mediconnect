const router = require('express').Router();
const { query } = require('../config/db');
const { auth, can } = require('../middleware/auth');

// GET /api/medecins-independants
router.get('/', async (req, res) => {
  try {
    const { specialite, ville } = req.query;
    let sql = "SELECT * FROM medecins_independants WHERE is_active=true";
    const p = [];
    if (specialite) { p.push(`%${specialite}%`); sql += ` AND specialite ILIKE $${p.length}`; }
    if (ville)      { p.push(`%${ville}%`);       sql += ` AND ville ILIKE $${p.length}`; }
    sql += ' ORDER BY nom,prenom';
    const r = await query(sql, p);
    res.json({ success: true, data: r.rows });
  } catch (e) { res.json({ success: true, data: [] }); }
});

// GET /api/medecins-independants/mon-profil
router.get('/mon-profil', auth, can('medecin_independant'), async (req, res) => {
  try {
    const r = await query('SELECT * FROM medecins_independants WHERE user_id=$1 LIMIT 1', [req.user.id]);
    res.json({ success: true, data: r.rows[0] || null });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// PUT /api/medecins-independants/mon-profil
router.put('/mon-profil', auth, can('medecin_independant'), async (req, res) => {
  const { specialite, tarif, telephone, adresse, ville, quartier,
          jours_travail, horaires_debut, horaires_fin,
          teleconsult, deplacement, latitude, longitude } = req.body;
  try {
    const jours = jours_travail
      ? (Array.isArray(jours_travail) ? jours_travail : jours_travail.split(','))
      : null;
    const geoSet = latitude && longitude
      ? ', geo_point=ST_SetSRID(ST_MakePoint($13,$12),4326)::geography' : '';
    const r = await query(
      `UPDATE medecins_independants
       SET specialite=COALESCE($1,specialite), tarif=COALESCE($2,tarif),
           telephone=COALESCE($3,telephone), adresse=COALESCE($4,adresse),
           ville=COALESCE($5,ville), quartier=COALESCE($6,quartier),
           jours_travail=COALESCE($7,jours_travail),
           horaires_debut=COALESCE($8,horaires_debut),
           horaires_fin=COALESCE($9,horaires_fin),
           teleconsult=COALESCE($10,teleconsult),
           deplacement=COALESCE($11,deplacement),
           latitude=COALESCE($12,latitude), longitude=COALESCE($13,longitude)${geoSet}
       WHERE user_id=$14 RETURNING *`,
      [specialite, tarif, telephone, adresse, ville, quartier,
       jours, horaires_debut, horaires_fin, teleconsult, deplacement,
       latitude, longitude, req.user.id]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
