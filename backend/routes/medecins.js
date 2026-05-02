const router = require('express').Router();
const { query } = require('../config/db');
const { auth, authorize } = require('../middleware/auth');
const { v4: uuid } = require('uuid');

const getCliniqueId = async (user_id) => {
  const r = await query('SELECT id FROM cliniques WHERE user_id=$1', [user_id]);
  return r.rows[0]?.id || null;
};

router.get('/', auth, async (req, res) => {
  try {
    const cid = await getCliniqueId(req.user.id);
    if (!cid) return res.json({ success: true, data: [] });
    const r = await query('SELECT * FROM medecins WHERE clinique_id=$1 ORDER BY nom', [cid]);
    res.json({ success: true, data: r.rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

router.post('/', auth, authorize('clinique'), async (req, res) => {
  const { prenom, nom, specialite, tarif, experience_ans, numero_ordre, horaires_debut, horaires_fin, type_personnel, telephone, email } = req.body;
  if (!prenom || !nom) return res.status(400).json({ success: false, message: 'Prénom et nom requis.' });
  try {
    const cid = await getCliniqueId(req.user.id);
    if (!cid) return res.status(404).json({ success: false, message: 'Clinique introuvable.' });
    const id = uuid();
    await query(`INSERT INTO medecins (id,clinique_id,prenom,nom,specialite,tarif,experience_ans,numero_ordre,horaires_debut,horaires_fin,jours_travail,statut,type_personnel,telephone,email)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'Disponible',$12,$13,$14)`,
      [id, cid, prenom, nom, specialite||null, tarif||0, experience_ans||0, numero_ordre||null,
       horaires_debut||'08:00', horaires_fin||'17:00', ['Lundi','Mardi','Mercredi','Jeudi','Vendredi'],
       type_personnel||'medecin', telephone||null, email||null]);
    const label = type_personnel === 'medecin' ? `Dr. ${prenom} ${nom}` : `${prenom} ${nom}`;
    res.status(201).json({ success: true, data: { id }, message: `${label} ajouté(e) à l'équipe.` });
  } catch (err) {
    console.error('Erreur ajout médecin:', err);
    res.status(500).json({ success: false, message: 'Erreur: ' + err.message });
  }
});

router.put('/:id', auth, authorize('clinique'), async (req, res) => {
  const { statut, tarif, horaires_debut, horaires_fin } = req.body;
  try {
    const sets = []; const vals = []; let i = 1;
    if (statut !== undefined) { sets.push(`statut=$${i++}`); vals.push(statut); }
    if (tarif !== undefined)  { sets.push(`tarif=$${i++}`); vals.push(tarif); }
    if (horaires_debut)       { sets.push(`horaires_debut=$${i++}`); vals.push(horaires_debut); }
    if (horaires_fin)         { sets.push(`horaires_fin=$${i++}`); vals.push(horaires_fin); }
    if (!sets.length) return res.json({ success: true });
    vals.push(req.params.id);
    await query(`UPDATE medecins SET ${sets.join(',')} WHERE id=$${i}`, vals);
    res.json({ success: true, message: 'Médecin mis à jour.' });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

router.delete('/:id', auth, authorize('clinique','admin'), async (req, res) => {
  try {
    await query('DELETE FROM medecins WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'Médecin retiré.' });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

module.exports = router;