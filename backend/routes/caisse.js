const router = require('express').Router();
const { query } = require('../config/db');
const { auth, authorize } = require('../middleware/auth');
const { v4: uuid } = require('uuid');

const getCaisseActive = async (clinique_id) => {
  const r = await query("SELECT * FROM caisses WHERE clinique_id=$1 AND statut='ouverte' ORDER BY created_at DESC LIMIT 1", [clinique_id]);
  return r.rows[0] || null;
};

router.get('/active', auth, authorize('clinique'), async (req, res) => {
  try {
    const cl = await query('SELECT id FROM cliniques WHERE user_id=$1', [req.user.id]);
    if (!cl.rows.length) return res.status(404).json({ success: false });
    const cid = cl.rows[0].id;
    const caisse = await getCaisseActive(cid);
    if (!caisse) return res.json({ success: true, data: null, statut: 'fermee', historique: [] });
    const txs = await query('SELECT * FROM transactions_caisse WHERE caisse_id=$1 ORDER BY created_at DESC', [caisse.id]);
    const hist = await query("SELECT * FROM caisses WHERE clinique_id=$1 AND statut='cloturee' ORDER BY created_at DESC LIMIT 30", [cid]);
    res.json({ success: true, data: { ...caisse, transactions: txs.rows }, historique: hist.rows, statut: 'ouverte' });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

router.post('/ouvrir', auth, authorize('clinique'), async (req, res) => {
  const { nom, solde_ouverture, operateur } = req.body;
  try {
    const cl = await query('SELECT id FROM cliniques WHERE user_id=$1', [req.user.id]);
    if (!cl.rows.length) return res.status(404).json({ success: false });
    const cid = cl.rows[0].id;
    const exist = await query("SELECT id FROM caisses WHERE clinique_id=$1 AND statut='ouverte'", [cid]);
    if (exist.rows.length) return res.status(400).json({ success: false, message: 'Une caisse est déjà ouverte.' });
    const id = uuid();
    await query(`INSERT INTO caisses(id,clinique_id,nom,operateur,date_ouverture,heure_ouverture,solde_ouverture,statut) VALUES($1,$2,$3,$4,CURRENT_DATE,CURRENT_TIME,$5,'ouverte')`,
      [id, cid, nom||'Caisse principale', operateur||(req.user.prenom+' '+req.user.nom), solde_ouverture||0]);
    res.status(201).json({ success: true, data: { id }, message: 'Caisse ouverte.' });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

router.post('/encaisser', auth, authorize('clinique'), async (req, res) => {
  const { label, montant, mode, reference } = req.body;
  if (!label || !montant) return res.status(400).json({ success: false, message: 'Libellé et montant requis.' });
  try {
    const cl = await query('SELECT id FROM cliniques WHERE user_id=$1', [req.user.id]);
    const caisse = await getCaisseActive(cl.rows[0].id);
    if (!caisse) return res.status(400).json({ success: false, message: 'Aucune caisse ouverte.' });
    await query(`INSERT INTO transactions_caisse(id,caisse_id,type,label,montant,mode,reference,caissier,heure) VALUES($1,$2,'encaissement',$3,$4,$5,$6,$7,CURRENT_TIME)`,
      [uuid(), caisse.id, label, montant, mode||'Espèces', reference||null, req.user.prenom+' '+req.user.nom]);
    res.json({ success: true, message: `Encaissement +${Number(montant).toLocaleString()} FCFA enregistré.` });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

router.post('/decaisser', auth, authorize('clinique'), async (req, res) => {
  const { label, montant, motif } = req.body;
  if (!label || !montant) return res.status(400).json({ success: false, message: 'Libellé et montant requis.' });
  try {
    const cl = await query('SELECT id FROM cliniques WHERE user_id=$1', [req.user.id]);
    const caisse = await getCaisseActive(cl.rows[0].id);
    if (!caisse) return res.status(400).json({ success: false, message: 'Aucune caisse ouverte.' });
    const t = await query(`SELECT COALESCE(SUM(CASE WHEN type='encaissement' THEN montant ELSE -montant END),0) AS net FROM transactions_caisse WHERE caisse_id=$1`, [caisse.id]);
    const solde = +caisse.solde_ouverture + +t.rows[0].net;
    if (montant > solde) return res.status(400).json({ success: false, message: `Solde insuffisant: ${solde.toLocaleString()} FCFA disponibles.` });
    await query(`INSERT INTO transactions_caisse(id,caisse_id,type,label,montant,mode,reference,caissier,heure) VALUES($1,$2,'decaissement',$3,$4,'Sortie',$5,$6,CURRENT_TIME)`,
      [uuid(), caisse.id, label, montant, motif||null, req.user.prenom+' '+req.user.nom]);
    res.json({ success: true, message: `Décaissement -${Number(montant).toLocaleString()} FCFA enregistré.` });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

router.post('/cloturer', auth, authorize('clinique'), async (req, res) => {
  try {
    const cl = await query('SELECT id FROM cliniques WHERE user_id=$1', [req.user.id]);
    const caisse = await getCaisseActive(cl.rows[0].id);
    if (!caisse) return res.status(400).json({ success: false, message: 'Aucune caisse ouverte.' });
    const t = await query(`SELECT COALESCE(SUM(CASE WHEN type='encaissement' THEN montant ELSE 0 END),0) AS enc, COALESCE(SUM(CASE WHEN type='decaissement' THEN montant ELSE 0 END),0) AS dec FROM transactions_caisse WHERE caisse_id=$1`, [caisse.id]);
    const final = +caisse.solde_ouverture + +t.rows[0].enc - +t.rows[0].dec;
    await query("UPDATE caisses SET statut='cloturee', solde_cloture=$1 WHERE id=$2", [final, caisse.id]);
    res.json({ success: true, data: { solde_ouverture: caisse.solde_ouverture, encaissements: +t.rows[0].enc, decaissements: +t.rows[0].dec, solde_final: final }, message: `Caisse clôturée. Solde final : ${final.toLocaleString()} FCFA` });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

module.exports = router;
