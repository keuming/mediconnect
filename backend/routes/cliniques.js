const router = require('express').Router();
const { query } = require('../config/db');
const { auth, can } = require('../middleware/auth');

const vd = d => d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;

// GET /api/cliniques
router.get('/', async (req, res) => {
  try {
    const r = await query('SELECT * FROM cliniques WHERE is_active=true ORDER BY nom');
    res.json({ success: true, data: r.rows });
  } catch (e) { res.json({ success: true, data: [] }); }
});

// GET /api/cliniques/mon-profil
router.get('/mon-profil', auth, can('clinique'), async (req, res) => {
  try {
    const r = await query('SELECT * FROM cliniques WHERE user_id=$1 LIMIT 1', [req.user.id]);
    res.json({ success: true, data: r.rows[0] || null });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// PUT /api/cliniques/mon-profil
router.put('/mon-profil', auth, can('clinique'), async (req, res) => {
  const { nom, type, email, telephone, adresse, ville, quartier, latitude, longitude } = req.body;
  try {
    const geoSet = latitude && longitude
      ? ', geo_point=ST_SetSRID(ST_MakePoint($9,$8),4326)::geography' : '';
    const r = await query(
      `UPDATE cliniques
       SET nom=COALESCE($1,nom), type=COALESCE($2,type),
           email=COALESCE($3,email), telephone=COALESCE($4,telephone),
           adresse=COALESCE($5,adresse), ville=COALESCE($6,ville),
           quartier=COALESCE($7,quartier),
           latitude=COALESCE($8,latitude), longitude=COALESCE($9,longitude)${geoSet}
       WHERE user_id=$10 RETURNING *`,
      [nom, type, email, telephone, adresse, ville, quartier, latitude, longitude, req.user.id]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET /api/cliniques/stats
router.get('/stats', auth, can('clinique'), async (req, res) => {
  try {
    const r = await query('SELECT id FROM cliniques WHERE user_id=$1 LIMIT 1', [req.user.id]);
    const cid = r.rows[0]?.id;
    if (!cid) return res.json({ success: true, data: { medecins_actifs: 0, rdv_ce_mois: 0, patients_mois: 0 } });
    const [m, rdv, p] = await Promise.all([
      query("SELECT COUNT(*) c FROM medecins WHERE clinique_id=$1 AND statut='Disponible'", [cid]),
      query("SELECT COUNT(*) c FROM rendez_vous WHERE clinique_id=$1 AND date_rdv>=date_trunc('month',CURRENT_DATE)", [cid]),
      query("SELECT COUNT(*) c FROM patients WHERE created_at>=date_trunc('month',CURRENT_DATE)", []),
    ]);
    res.json({ success: true, data: {
      medecins_actifs: parseInt(m.rows[0]?.c)  || 0,
      rdv_ce_mois:     parseInt(rdv.rows[0]?.c) || 0,
      patients_mois:   parseInt(p.rows[0]?.c)   || 0,
    }});
  } catch (e) { res.json({ success: true, data: { medecins_actifs: 0, rdv_ce_mois: 0, patients_mois: 0 } }); }
});

module.exports = router;
