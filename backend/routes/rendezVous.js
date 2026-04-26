const router = require('express').Router();
const { query } = require('../config/db');
const { auth, authorize } = require('../middleware/auth');
const { v4: uuid } = require('uuid');

const getCliniqueId = async (uid) => (await query('SELECT id FROM cliniques WHERE user_id=$1',[uid])).rows[0]?.id;
const getPatientId  = async (uid) => (await query('SELECT id FROM patients WHERE user_id=$1',[uid])).rows[0]?.id;

router.get('/', auth, async (req, res) => {
  try {
    let sql, params = [];
    if (req.user.role === 'clinique') {
      const cid = await getCliniqueId(req.user.id);
      sql = `SELECT rv.*, u.prenom||' '||u.nom AS patient_nom, m.prenom||' '||m.nom AS medecin_nom
        FROM rendez_vous rv
        LEFT JOIN patients p ON p.id=rv.patient_id
        LEFT JOIN utilisateurs u ON u.id=p.user_id
        LEFT JOIN medecins m ON m.id=rv.medecin_id
        WHERE rv.clinique_id=$1 ORDER BY rv.date_rdv DESC, rv.heure_rdv`;
      params = [cid];
    } else if (req.user.role === 'patient') {
      const pid = await getPatientId(req.user.id);
      sql = `SELECT rv.*, m.prenom||' '||m.nom AS medecin_nom, cl.nom AS clinique_nom
        FROM rendez_vous rv
        LEFT JOIN medecins m ON m.id=rv.medecin_id
        LEFT JOIN cliniques cl ON cl.id=rv.clinique_id
        WHERE rv.patient_id=$1 ORDER BY rv.date_rdv DESC`;
      params = [pid];
    } else {
      sql = 'SELECT * FROM rendez_vous ORDER BY date_rdv DESC LIMIT 100';
    }
    if (req.query.date) { sql = sql.replace('ORDER BY', `AND rv.date_rdv=\'${req.query.date}\' ORDER BY`); }
    const r = await query(sql, params);
    res.json({ success: true, data: r.rows });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur' }); }
});

router.post('/', auth, async (req, res) => {
  const { patient_nom, medecin_nom, date_rdv, heure_rdv, motif, assurance, statut } = req.body;
  if (!date_rdv) return res.status(400).json({ success: false, message: 'Date requise.' });
  try {
    const cid = await getCliniqueId(req.user.id);
    // Trouver ou créer un patient temporaire
    let pid = null;
    if (patient_nom) {
      const parts = patient_nom.trim().split(' ');
      const pResult = await query(`SELECT p.id FROM patients p JOIN utilisateurs u ON u.id=p.user_id WHERE u.prenom=$1 OR u.nom=$2 LIMIT 1`, [parts[0], parts[parts.length-1]]);
      pid = pResult.rows[0]?.id;
    }
    // Trouver médecin si nom fourni
    let mid = null;
    if (medecin_nom && cid) {
      const parts = medecin_nom.split(' ');
      const mResult = await query('SELECT id FROM medecins WHERE clinique_id=$1 AND (prenom=$2 OR nom=$3) LIMIT 1', [cid, parts[0]||'', parts[parts.length-1]||'']);
      mid = mResult.rows[0]?.id;
    }
    const id = uuid();
    await query(`INSERT INTO rendez_vous (id,patient_id,clinique_id,medecin_id,date_rdv,heure_rdv,motif,assurance,statut)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, pid, cid, mid, date_rdv, heure_rdv||'09:00', motif||'', assurance||null, statut||'en_attente']);
    res.status(201).json({ success: true, data: { id }, message: 'RDV créé.' });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Erreur' }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const { statut, heure_rdv, motif, notes } = req.body;
    const sets = []; const vals = []; let i = 1;
    if (statut)   { sets.push(`statut=$${i++}`); vals.push(statut); }
    if (heure_rdv){ sets.push(`heure_rdv=$${i++}`); vals.push(heure_rdv); }
    if (motif)    { sets.push(`motif=$${i++}`); vals.push(motif); }
    if (notes)    { sets.push(`notes=$${i++}`); vals.push(notes); }
    if (!sets.length) return res.json({ success: true });
    vals.push(req.params.id);
    await query(`UPDATE rendez_vous SET ${sets.join(',')} WHERE id=$${i}`, vals);
    res.json({ success: true, message: 'RDV mis à jour.' });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await query("UPDATE rendez_vous SET statut='annule' WHERE id=$1", [req.params.id]);
    res.json({ success: true, message: 'RDV annulé.' });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

module.exports = router;