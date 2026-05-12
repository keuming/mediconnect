const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { query } = require('../config/db');

// GET /api/public/cliniques
router.get('/cliniques', async (req, res) => {
  try {
    const r = await query('SELECT * FROM cliniques WHERE is_active=true ORDER BY nom');
    res.json({ success: true, data: r.rows });
  } catch (e) { res.json({ success: true, data: [] }); }
});

// GET /api/public/medecins
router.get('/medecins', async (req, res) => {
  try {
    const { clinique_id, specialite } = req.query;
    let sql = 'SELECT m.*,c.nom AS clinique_nom FROM medecins m LEFT JOIN cliniques c ON c.id=m.clinique_id WHERE 1=1';
    const p = [];
    if (clinique_id) { p.push(clinique_id);        sql += ` AND m.clinique_id=$${p.length}`; }
    if (specialite)  { p.push(`%${specialite}%`);  sql += ` AND m.specialite ILIKE $${p.length}`; }
    sql += ' ORDER BY m.nom,m.prenom';
    const r = await query(sql, p);
    res.json({ success: true, data: r.rows });
  } catch (e) { res.json({ success: true, data: [] }); }
});

// GET /api/public/medecins-independants
router.get('/medecins-independants', async (req, res) => {
  try {
    const { specialite, ville } = req.query;
    let sql = "SELECT * FROM medecins_independants WHERE is_active=true AND statut='Disponible'";
    const p = [];
    if (specialite) { p.push(`%${specialite}%`); sql += ` AND specialite ILIKE $${p.length}`; }
    if (ville)      { p.push(`%${ville}%`);       sql += ` AND ville ILIKE $${p.length}`; }
    sql += ' ORDER BY note_moyenne DESC,nom';
    const r = await query(sql, p);
    res.json({ success: true, data: r.rows });
  } catch (e) { res.json({ success: true, data: [] }); }
});

// POST /api/public/rdv
router.post('/rdv', async (req, res) => {
  const { patient_id, clinique_id, medecin_id, medecin_independant_id,
          date_rdv, heure_rdv, motif, assurance, numero_police } = req.body;
  if (!date_rdv || !heure_rdv)
    return res.status(400).json({ success: false, message: 'Date et heure requises' });
  if (!clinique_id && !medecin_independant_id)
    return res.status(400).json({ success: false, message: 'Clinique ou médecin indépendant requis' });
  try {
    const r = await query(
      `INSERT INTO rendez_vous
         (id,patient_id,clinique_id,medecin_id,medecin_independant_id,
          date_rdv,heure_rdv,motif,assurance,numero_police,statut)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'en_attente') RETURNING *`,
      [uuid(), patient_id || null, clinique_id || null, medecin_id || null,
       medecin_independant_id || null, date_rdv, heure_rdv,
       motif || null, assurance || null, numero_police || null]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
