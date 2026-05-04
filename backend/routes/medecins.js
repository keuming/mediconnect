const router = require('express').Router();
const { query } = require('../config/db');
const { auth } = require('../middleware/auth');
const { v4: uuid } = require('uuid');

const init = async () => {
  await query(`CREATE TABLE IF NOT EXISTS medecins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, clinique_id UUID,
    prenom VARCHAR(100), nom VARCHAR(100),
    specialite VARCHAR(100), telephone VARCHAR(30),
    email VARCHAR(200), tarif DECIMAL(10,2),
    experience_ans INTEGER, statut VARCHAR(30) DEFAULT 'Disponible',
    jours_travail VARCHAR(200) DEFAULT 'Lun,Mar,Mer,Jeu,Ven',
    horaires_debut TIME DEFAULT '08:00',
    horaires_fin TIME DEFAULT '17:00',
    note_moyenne DECIMAL(3,2), photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`).catch(e => console.error('Table medecins:', e.message));
};
init();

router.get('/', auth, async (req, res) => {
  try {
    const cliniqueId = req.user?.clinique_id;
    let sql = 'SELECT * FROM medecins WHERE 1=1';
    const params = [];
    if (cliniqueId) { params.push(cliniqueId); sql += ` AND clinique_id=$${params.length}`; }
    sql += ' ORDER BY nom, prenom';
    const r = await query(sql, params);
    res.json({ success: true, data: r.rows });
  } catch(err) { res.json({ success: true, data: [] }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { prenom, nom, specialite, telephone, email, tarif, experience_ans, jours_travail, horaires_debut, horaires_fin } = req.body;
    if (!prenom || !nom || !specialite) return res.status(400).json({ success: false, message: 'Prénom, nom et spécialité requis' });
    const cliniqueId = req.user?.clinique_id;
    const r = await query(
      `INSERT INTO medecins (id,clinique_id,prenom,nom,specialite,telephone,email,tarif,experience_ans,jours_travail,horaires_debut,horaires_fin)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [uuid(),cliniqueId,prenom,nom,specialite,telephone||null,email||null,tarif||null,experience_ans||null,jours_travail||'Lun,Mar,Mer,Jeu,Ven',horaires_debut||'08:00',horaires_fin||'17:00']
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { prenom, nom, specialite, statut, tarif, telephone, experience_ans, jours_travail, horaires_debut, horaires_fin } = req.body;
    const r = await query(
      `UPDATE medecins SET prenom=COALESCE($1,prenom), nom=COALESCE($2,nom), specialite=COALESCE($3,specialite),
       statut=COALESCE($4,statut), tarif=COALESCE($5,tarif), telephone=COALESCE($6,telephone),
       experience_ans=COALESCE($7,experience_ans), jours_travail=COALESCE($8,jours_travail),
       horaires_debut=COALESCE($9,horaires_debut), horaires_fin=COALESCE($10,horaires_fin), updated_at=NOW()
       WHERE id=$11 RETURNING *`,
      [prenom,nom,specialite,statut,tarif,telephone,experience_ans,jours_travail,horaires_debut,horaires_fin,req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ success: false, message: 'Médecin introuvable' });
    res.json({ success: true, data: r.rows[0] });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await query('DELETE FROM medecins WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'Médecin supprimé' });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
