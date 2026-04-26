const router = require('express').Router();
const { query } = require('../config/db');
const { auth, authorize } = require('../middleware/auth');
const { v4: uuid } = require('uuid');

const getCliniqueId = async (uid) => (await query('SELECT id FROM cliniques WHERE user_id=$1',[uid])).rows[0]?.id;

router.get('/', auth, async (req, res) => {
  try {
    const cid = await getCliniqueId(req.user.id);
    const r = await query(`SELECT f.*, u.prenom||' '||u.nom AS patient_nom
      FROM factures f LEFT JOIN patients p ON p.id=f.patient_id LEFT JOIN utilisateurs u ON u.id=p.user_id
      WHERE f.clinique_id=$1 ORDER BY f.created_at DESC`, [cid||uuid()]);
    res.json({ success: true, data: r.rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

router.post('/', auth, authorize('clinique'), async (req, res) => {
  const { patient_nom, montant_total, montant_assur, ticket_moder, mode_paiement } = req.body;
  if (!montant_total) return res.status(400).json({ success: false, message: 'Montant requis.' });
  try {
    const cid = await getCliniqueId(req.user.id);
    const ref = '#FAC-' + Date.now().toString().slice(-4);
    const id = uuid();
    await query(`INSERT INTO factures (id,reference,clinique_id,patient_id,montant_total,montant_assur,ticket_moder,mode_paiement,statut)
      VALUES ($1,$2,$3,NULL,$4,$5,$6,$7,'en_attente')`,
      [id, ref, cid, montant_total, montant_assur||0, ticket_moder||montant_total, mode_paiement||'Espèces']);
    res.status(201).json({ success: true, data: { id, reference: ref }, message: `Facture ${ref} créée.` });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

router.put('/:id', auth, authorize('clinique'), async (req, res) => {
  const { statut } = req.body;
  try {
    await query('UPDATE factures SET statut=$1 WHERE id=$2', [statut, req.params.id]);
    res.json({ success: true, message: 'Facture mise à jour.' });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

router.delete('/:id', auth, authorize('clinique','admin'), async (req, res) => {
  try {
    await query('DELETE FROM factures WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'Facture supprimée.' });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

module.exports = router;