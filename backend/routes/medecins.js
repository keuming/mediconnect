const router = require('express').Router();
const { v4: uuid } = require('uuid');
const { query } = require('../config/db');
const { auth, can } = require('../middleware/auth');

// GET /api/medecins
router.get('/', auth, async (req, res) => {
  try {
    const { clinique_id } = req.query;
    const cid = clinique_id || req.user?.profile_id;
    const r = cid
      ? await query('SELECT * FROM medecins WHERE clinique_id=$1 ORDER BY nom,prenom', [cid])
      : await query('SELECT * FROM medecins ORDER BY nom,prenom');
    res.json({ success: true, data: r.rows });
  } catch (e) { res.json({ success: true, data: [] }); }
});

// POST /api/medecins
router.post('/', auth, can('clinique', 'admin'), async (req, res) => {
  const { prenom, nom, specialite, telephone, tarif, experience_ans, jours_travail, horaires_debut, horaires_fin } = req.body;
  if (!prenom || !nom || !specialite)
    return res.status(400).json({ success: false, message: 'Prénom, nom et spécialité requis' });
  try {
    const cr = await query('SELECT id FROM cliniques WHERE user_id=$1 LIMIT 1', [req.user.id]);
    const jours = Array.isArray(jours_travail) ? jours_travail : ['Lun','Mar','Mer','Jeu','Ven'];
    const r = await query(
      `INSERT INTO medecins
         (id,clinique_id,prenom,nom,specialite,telephone,tarif,experience_ans,jours_travail,horaires_debut,horaires_fin)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [uuid(), cr.rows[0]?.id || null, prenom, nom, specialite, telephone || null,
       tarif || 15000, experience_ans || 0, jours,
       horaires_debut || '08:00', horaires_fin || '17:00']
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// PUT /api/medecins/:id
router.put('/:id', auth, can('clinique', 'admin'), async (req, res) => {
  const { prenom, nom, specialite, statut, tarif, telephone, experience_ans, jours_travail, horaires_debut, horaires_fin } = req.body;
  try {
    const jours = jours_travail
      ? (Array.isArray(jours_travail) ? jours_travail : jours_travail.split(','))
      : null;
    const r = await query(
      `UPDATE medecins
       SET prenom=COALESCE($1,prenom), nom=COALESCE($2,nom),
           specialite=COALESCE($3,specialite), statut=COALESCE($4,statut),
           tarif=COALESCE($5,tarif), telephone=COALESCE($6,telephone),
           experience_ans=COALESCE($7,experience_ans),
           jours_travail=COALESCE($8,jours_travail),
           horaires_debut=COALESCE($9,horaires_debut),
           horaires_fin=COALESCE($10,horaires_fin)
       WHERE id=$11 RETURNING *`,
      [prenom, nom, specialite, statut, tarif, telephone, experience_ans,
       jours, horaires_debut, horaires_fin, req.params.id]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// DELETE /api/medecins/:id
router.delete('/:id', auth, can('clinique', 'admin'), async (req, res) => {
  try {
    await query('DELETE FROM medecins WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
