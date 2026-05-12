const router = require('express').Router();
const { query } = require('../config/db');

const geoProches = (table) => async (req, res) => {
  const { latitude, longitude, rayon_km = 10 } = req.query;
  if (!latitude || !longitude)
    return res.status(400).json({ success: false, message: 'latitude et longitude requis' });
  try {
    const r = await query(
      `SELECT *,
         ROUND(ST_Distance(geo_point, ST_SetSRID(ST_MakePoint($2,$1),4326)::geography) / 1000, 2) AS distance_km
       FROM ${table}
       WHERE is_active=true
         AND geo_point IS NOT NULL
         AND ST_DWithin(geo_point, ST_SetSRID(ST_MakePoint($2,$1),4326)::geography, $3)
       ORDER BY distance_km ASC LIMIT 50`,
      [parseFloat(latitude), parseFloat(longitude), parseFloat(rayon_km) * 1000]
    );
    res.json({ success: true, data: r.rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

router.get('/cliniques',             geoProches('cliniques'));
router.get('/pharmacies',            geoProches('pharmacies'));
router.get('/laboratoires',          geoProches('laboratoires'));
router.get('/imageries',             geoProches('imageries'));
router.get('/medecins-independants', geoProches('medecins_independants'));

module.exports = router;
