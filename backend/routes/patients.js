const router = require('express').Router();
const { query } = require('../config/db');
const { auth, authorize } = require('../middleware/auth');
const { v4: uuid } = require('uuid');

const genCode = (p, n) => `MC-${(p[0]+n[0]).toUpperCase()}-${Math.floor(1000+Math.random()*9000)}`;

// GET /api/patients — liste pour la clinique connectée
router.get('/', auth, async (req, res) => {
  try {
    let r;
    if (req.user.role === 'clinique') {
      r = await query(`SELECT p.*, u.prenom||' '||u.nom AS user_nom, u.telephone
        FROM patients p JOIN utilisateurs u ON u.id=p.user_id
        ORDER BY u.nom`, []);
    } else if (req.user.role === 'patient') {
      r = await query('SELECT * FROM patients WHERE user_id=$1', [req.user.id]);
    } else {
      r = await query('SELECT p.*, u.prenom||\' \'||u.nom AS user_nom FROM patients p JOIN utilisateurs u ON u.id=p.user_id ORDER BY u.nom', []);
    }
    res.json({ success: true, data: r.rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

// GET /api/patients/moi
router.get('/moi', auth, authorize('patient'), async (req, res) => {
  try {
    const r = await query('SELECT p.*, u.prenom, u.nom, u.email, u.telephone FROM patients p JOIN utilisateurs u ON u.id=p.user_id WHERE p.user_id=$1', [req.user.id]);
    res.json({ success: true, data: r.rows[0] || null });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

// POST /api/patients
router.post('/', auth, authorize('clinique','admin'), async (req, res) => {
  const { prenom, nom, date_naissance, sexe, groupe_sanguin, telephone, allergies } = req.body;
  if (!prenom || !nom) return res.status(400).json({ success: false, message: 'Prénom et nom requis.' });
  try {
    // Créer un utilisateur temporaire
    const uid = uuid();
    await query(`INSERT INTO utilisateurs (id,email,password,role,prenom,nom,telephone)
      VALUES ($1,$2,$3,'patient',$4,$5,$6)`,
      [uid, `${prenom.toLowerCase()}.${nom.toLowerCase()}.${Date.now()}@mediconnect.ci`, 'temp', prenom, nom, telephone||null]);
    const code = genCode(prenom, nom);
    const pid = uuid();
    await query(`INSERT INTO patients (id,user_id,date_naissance,sexe,groupe_sanguin,allergies,code_secret)
      VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [pid, uid, date_naissance||null, sexe||'M', groupe_sanguin||'O+', allergies||[], code]);
    res.status(201).json({ success: true, data: { id: pid, code_secret: code }, message: `Dossier EMR créé. Code : ${code}` });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur' }); }
});

router.delete('/:id', auth, authorize('clinique','admin'), async (req, res) => {
  try {
    await query('UPDATE utilisateurs SET is_active=false WHERE id=(SELECT user_id FROM patients WHERE id=$1)', [req.params.id]);
    res.json({ success: true, message: 'Dossier archivé.' });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

module.exports = router;