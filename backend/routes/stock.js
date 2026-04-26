const router = require('express').Router();
const { query } = require('../config/db');
const { auth, authorize } = require('../middleware/auth');
const { v4: uuid } = require('uuid');

const getCliniqueId  = async (uid) => (await query('SELECT id FROM cliniques WHERE user_id=$1',[uid])).rows[0]?.id;
const getPharmaId    = async (uid) => (await query('SELECT id FROM pharmacies WHERE user_id=$1',[uid])).rows[0]?.id;

// ── Clinique ──────────────────────────────────────────────────────
router.get('/clinique', auth, async (req, res) => {
  try {
    const cid = await getCliniqueId(req.user.id);
    const r = await query('SELECT * FROM stock_clinique WHERE clinique_id=$1 ORDER BY nom', [cid||uuid()]);
    res.json({ success: true, data: r.rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

router.post('/clinique', auth, authorize('clinique'), async (req, res) => {
  const { nom, categorie, fournisseur, quantite, seuil_alerte, prix_unitaire, numero_lot, date_expiration } = req.body;
  if (!nom) return res.status(400).json({ success: false, message: 'Nom requis.' });
  try {
    const cid = await getCliniqueId(req.user.id);
    const id = uuid();
    await query(`INSERT INTO stock_clinique (id,clinique_id,nom,categorie,fournisseur,quantite,seuil_alerte,prix_unitaire,numero_lot,date_expiration)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [id, cid, nom, categorie||'Autre', fournisseur||null, quantite||0, seuil_alerte||50, prix_unitaire||0, numero_lot||null, date_expiration||null]);
    res.status(201).json({ success: true, data: { id }, message: `${nom} ajouté au stock.` });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

router.put('/clinique/:id', auth, authorize('clinique'), async (req, res) => {
  const { quantite, prix_unitaire, seuil_alerte } = req.body;
  try {
    const sets = []; const vals = []; let i = 1;
    if (quantite !== undefined)     { sets.push(`quantite=$${i++}`); vals.push(quantite); }
    if (prix_unitaire !== undefined){ sets.push(`prix_unitaire=$${i++}`); vals.push(prix_unitaire); }
    if (seuil_alerte !== undefined) { sets.push(`seuil_alerte=$${i++}`); vals.push(seuil_alerte); }
    sets.push(`updated_at=NOW()`);
    vals.push(req.params.id);
    await query(`UPDATE stock_clinique SET ${sets.join(',')} WHERE id=$${i}`, vals);
    res.json({ success: true, message: 'Stock mis à jour.' });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

router.delete('/clinique/:id', auth, authorize('clinique','admin'), async (req, res) => {
  try {
    await query('DELETE FROM stock_clinique WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'Article supprimé.' });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

// ── Pharmacie ─────────────────────────────────────────────────────
router.get('/pharmacie', auth, async (req, res) => {
  try {
    const pid = await getPharmaId(req.user.id);
    const r = await query('SELECT * FROM stock_pharmacie WHERE pharmacie_id=$1 ORDER BY nom', [pid||uuid()]);
    res.json({ success: true, data: r.rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

router.post('/pharmacie', auth, authorize('pharmacie'), async (req, res) => {
  const { nom, categorie, fournisseur, quantite, seuil_alerte, prix_unitaire, numero_lot, date_expiration } = req.body;
  if (!nom) return res.status(400).json({ success: false, message: 'Nom requis.' });
  try {
    const pid = await getPharmaId(req.user.id);
    const id = uuid();
    await query(`INSERT INTO stock_pharmacie (id,pharmacie_id,nom,categorie,fournisseur,quantite,seuil_alerte,prix_unitaire,numero_lot,date_expiration)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [id, pid, nom, categorie||'Autre', fournisseur||null, quantite||0, seuil_alerte||50, prix_unitaire||0, numero_lot||null, date_expiration||null]);
    res.status(201).json({ success: true, data: { id }, message: `${nom} ajouté au stock.` });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

router.put('/pharmacie/:id', auth, authorize('pharmacie'), async (req, res) => {
  const { quantite } = req.body;
  try {
    await query('UPDATE stock_pharmacie SET quantite=$1, updated_at=NOW() WHERE id=$2', [quantite, req.params.id]);
    res.json({ success: true, message: 'Stock mis à jour.' });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

router.delete('/pharmacie/:id', auth, authorize('pharmacie','admin'), async (req, res) => {
  try {
    await query('DELETE FROM stock_pharmacie WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'Article supprimé.' });
  } catch (err) { res.status(500).json({ success: false, message: 'Erreur' }); }
});

module.exports = router;