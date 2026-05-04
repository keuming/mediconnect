const router = require('express').Router();
const { query } = require('../config/db');
const { auth } = require('../middleware/auth');
const { v4: uuid } = require('uuid');

const init = async () => {
  await query(`CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    clinique_id UUID,
    code_secret VARCHAR(30),
    prenom VARCHAR(100),
    nom VARCHAR(100),
    telephone VARCHAR(30),
    email VARCHAR(200),
    date_naissance DATE,
    groupe_sanguin VARCHAR(10),
    allergies TEXT,
    antecedents TEXT,
    adresse TEXT,
    ville VARCHAR(100),
    assurance VARCHAR(100),
    numero_police VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`).catch(e => console.error('Table patients:', e.message));
};
init();

router.get('/', auth, async (req, res) => {
  try {
    const cliniqueId = req.user?.clinique_id;
    let sql = 'SELECT * FROM patients WHERE 1=1';
    const params = [];
    if (cliniqueId) { params.push(cliniqueId); sql += ` AND clinique_id=$${params.length}`; }
    sql += ' ORDER BY nom, prenom LIMIT 500';
    const r = await query(sql, params);
    res.json({ success: true, data: r.rows });
  } catch(err) { res.json({ success: true, data: [] }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const r = await query('SELECT * FROM patients WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ success: false, message: 'Patient introuvable' });
    res.json({ success: true, data: r.rows[0] });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { prenom, nom, telephone, email, date_naissance, groupe_sanguin, allergies, antecedents, adresse, ville, assurance, numero_police } = req.body;
    if (!prenom || !nom) return res.status(400).json({ success: false, message: 'Prénom et nom requis' });
    const cliniqueId = req.user?.clinique_id;
    const code = 'MC-' + (prenom[0]+nom[0]).toUpperCase() + '-' + Math.floor(1000+Math.random()*9000);
    const validDate = d => d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
    const r = await query(
      `INSERT INTO patients (id,clinique_id,code_secret,prenom,nom,telephone,email,date_naissance,groupe_sanguin,allergies,antecedents,adresse,ville,assurance,numero_police)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [uuid(),cliniqueId,code,prenom,nom,telephone||null,email||null,validDate(date_naissance),groupe_sanguin||null,allergies||null,antecedents||null,adresse||null,ville||null,assurance||null,numero_police||null]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { prenom, nom, telephone, email, groupe_sanguin, allergies, antecedents, assurance } = req.body;
    const r = await query(
      `UPDATE patients SET prenom=COALESCE($1,prenom), nom=COALESCE($2,nom), telephone=COALESCE($3,telephone),
       email=COALESCE($4,email), groupe_sanguin=COALESCE($5,groupe_sanguin), allergies=COALESCE($6,allergies),
       antecedents=COALESCE($7,antecedents), assurance=COALESCE($8,assurance), updated_at=NOW()
       WHERE id=$9 RETURNING *`,
      [prenom,nom,telephone,email,groupe_sanguin,allergies,antecedents,assurance,req.params.id]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch(err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
