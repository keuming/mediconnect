const router = require('express').Router();
const { db } = require('../config/db');
const { auth, can } = require('../middleware/auth');

// ── PUBLIC : Scanner QR Code ──────────────────────────────────────
// Accessible sans auth — pour toute personne qui scanne la carte
router.get('/public/scan/:numero_carte', async (req, res) => {
  try {
    const { numero_carte } = req.params;
    const card = await db('SELECT * FROM mediconnect_cards WHERE numero_carte=$1', [numero_carte]);
    if (!card.rows.length) return res.status(404).json({ success: false, message: 'Carte introuvable' });

    const account = await db(`
      SELECT a.id, a.prenom, a.nom, a.telephone, a.ville, a.pays_code,
             a.groupe_sanguin, a.allergies, a.niveau, a.numero_compte,
             a.photo_url
      FROM mediconnect_accounts a
      WHERE a.carte_id=$1 AND a.statut='actif'
    `, [card.rows[0].id]);

    if (!account.rows.length) {
      return res.json({ success: true, data: { carte: numero_carte, liee: false, message: 'Carte non liée à un compte' } });
    }

    // Contacts d'urgence (accessibles au public via QR scan)
    const contacts = await db(
      'SELECT prenom, nom, telephone, telephone_2, relation, est_principal FROM contacts_urgence WHERE account_id=$1 ORDER BY ordre',
      [account.rows[0].id]
    );

    // Enregistrer le scan
    await db(
      'INSERT INTO scans_qr_card (carte_id, account_id) VALUES ($1, $2)',
      [card.rows[0].id, account.rows[0].id]
    ).catch(() => {});

    res.json({
      success: true,
      data: {
        liee: true,
        carte: numero_carte,
        patient: {
          prenom: account.rows[0].prenom,
          nom: account.rows[0].nom,
          telephone: account.rows[0].telephone,
          ville: account.rows[0].ville,
          groupe_sanguin: account.rows[0].groupe_sanguin,
          allergies: account.rows[0].allergies,
          niveau: account.rows[0].niveau,
          photo_url: account.rows[0].photo_url,
        },
        contacts_urgence: contacts.rows,
      }
    });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── MON COMPTE CARD ───────────────────────────────────────────────
router.get('/mon-compte', auth, async (req, res) => {
  try {
    const r = await db(`
      SELECT a.*, c.numero_carte, c.statut AS carte_statut
      FROM mediconnect_accounts a
      LEFT JOIN mediconnect_cards c ON c.id=a.carte_id
      WHERE a.user_id=$1
    `, [req.user.id]);

    if (!r.rows.length) return res.json({ success: true, data: null });

    const contacts = await db(
      'SELECT * FROM contacts_urgence WHERE account_id=$1 ORDER BY ordre',
      [r.rows[0].id]
    );

    const transactions = await db(
      'SELECT * FROM transactions_card WHERE account_id=$1 ORDER BY created_at DESC LIMIT 20',
      [r.rows[0].id]
    );

    res.json({
      success: true,
      data: {
        ...r.rows[0],
        contacts_urgence: contacts.rows,
        transactions_recentes: transactions.rows,
      }
    });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── CRÉER / LIER COMPTE CARD ──────────────────────────────────────
router.post('/lier-carte', auth, async (req, res) => {
  const {
    prenom, nom, telephone, email, adresse, ville, pays_code,
    date_naissance, groupe_sanguin, allergies, numero_carte,
    contacts_urgence
  } = req.body;

  if (!prenom || !nom || !numero_carte)
    return res.status(400).json({ success: false, message: 'Prénom, nom et numéro de carte requis' });

  try {
    // Vérifier que la carte existe et n'est pas déjà liée
    const card = await db("SELECT * FROM mediconnect_cards WHERE numero_carte=$1", [numero_carte]);
    if (!card.rows.length)
      return res.status(404).json({ success: false, message: 'Numéro de carte invalide ou inexistant' });
    if (card.rows[0].statut === 'liee')
      return res.status(409).json({ success: false, message: 'Cette carte est déjà liée à un compte' });

    // Vérifier que l'utilisateur n'a pas déjà un compte card
    const existing = await db("SELECT id FROM mediconnect_accounts WHERE user_id=$1", [req.user.id]);
    if (existing.rows.length)
      return res.status(409).json({ success: false, message: 'Vous avez déjà un compte MediConnect Card' });

    // Générer numéro de compte unique
    const annee = new Date().getFullYear();
    const codeP = pays_code || 'CI';
    const seq = await db("SELECT COUNT(*)+1 AS n FROM mediconnect_accounts WHERE numero_compte LIKE $1", [`MCA-${codeP}-%`]);
    const numCompte = `MCA-${codeP}-${annee}-${String(seq.rows[0].n).padStart(6,'0')}`;

    // Créer le compte
    const account = await db(`
      INSERT INTO mediconnect_accounts
        (user_id, numero_compte, carte_id, numero_carte, prenom, nom, telephone, email,
         adresse, ville, pays_code, date_naissance, groupe_sanguin, allergies,
         solde, statut, date_linkage)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,0,'actif',NOW())
      RETURNING *`,
      [req.user.id, numCompte, card.rows[0].id, numero_carte,
       prenom, nom, telephone||null, email||null, adresse||null, ville||null,
       pays_code||'CI', date_naissance||null, groupe_sanguin||null, allergies||null]
    );

    // Marquer la carte comme liée
    await db("UPDATE mediconnect_cards SET statut='liee', updated_at=NOW() WHERE id=$1", [card.rows[0].id]);

    // Ajouter les contacts d'urgence
    if (contacts_urgence?.length) {
      for (let i = 0; i < Math.min(contacts_urgence.length, 10); i++) {
        const c = contacts_urgence[i];
        if (c.telephone && c.prenom) {
          await db(`
            INSERT INTO contacts_urgence
              (account_id, ordre, prenom, nom, telephone, telephone_2, relation, est_principal)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [account.rows[0].id, i+1, c.prenom, c.nom||'', c.telephone,
             c.telephone_2||null, c.relation||null, i===0]
          ).catch(()=>{});
        }
      }
    }

    res.status(201).json({
      success: true,
      data: account.rows[0],
      message: `Carte liée avec succès ! Votre numéro de compte : ${numCompte}`
    });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── METTRE À JOUR COMPTE CARD ─────────────────────────────────────
router.put('/mon-compte', auth, async (req, res) => {
  const { prenom, nom, telephone, email, adresse, ville, groupe_sanguin, allergies, photo_url } = req.body;
  try {
    const r = await db(`
      UPDATE mediconnect_accounts SET
        prenom=COALESCE($1,prenom), nom=COALESCE($2,nom),
        telephone=COALESCE($3,telephone), email=COALESCE($4,email),
        adresse=COALESCE($5,adresse), ville=COALESCE($6,ville),
        groupe_sanguin=COALESCE($7,groupe_sanguin), allergies=COALESCE($8,allergies),
        photo_url=COALESCE($9,photo_url), updated_at=NOW()
      WHERE user_id=$10 RETURNING *`,
      [prenom,nom,telephone,email,adresse,ville,groupe_sanguin,allergies,photo_url,req.user.id]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── CONTACTS D'URGENCE ────────────────────────────────────────────
router.get('/contacts-urgence', auth, async (req, res) => {
  try {
    const account = await db("SELECT id FROM mediconnect_accounts WHERE user_id=$1", [req.user.id]);
    if (!account.rows.length) return res.json({ success: true, data: [] });
    const r = await db('SELECT * FROM contacts_urgence WHERE account_id=$1 ORDER BY ordre', [account.rows[0].id]);
    res.json({ success: true, data: r.rows });
  } catch(e) { res.json({ success: true, data: [] }); }
});

router.post('/contacts-urgence', auth, async (req, res) => {
  const { prenom, nom, telephone, telephone_2, relation } = req.body;
  if (!prenom || !telephone) return res.status(400).json({ success: false, message: 'Prénom et téléphone requis' });
  try {
    const account = await db("SELECT id FROM mediconnect_accounts WHERE user_id=$1", [req.user.id]);
    if (!account.rows.length) return res.status(404).json({ success: false, message: 'Compte card non trouvé' });
    const count = await db("SELECT COUNT(*) c FROM contacts_urgence WHERE account_id=$1", [account.rows[0].id]);
    if (+count.rows[0].c >= 10) return res.status(400).json({ success: false, message: 'Maximum 10 contacts d\'urgence' });
    const r = await db(
      'INSERT INTO contacts_urgence (account_id,ordre,prenom,nom,telephone,telephone_2,relation) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [account.rows[0].id, +count.rows[0].c+1, prenom, nom||'', telephone, telephone_2||null, relation||null]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/contacts-urgence/:id', auth, async (req, res) => {
  const { prenom, nom, telephone, telephone_2, relation } = req.body;
  try {
    const r = await db(
      'UPDATE contacts_urgence SET prenom=COALESCE($1,prenom),nom=COALESCE($2,nom),telephone=COALESCE($3,telephone),telephone_2=COALESCE($4,telephone_2),relation=COALESCE($5,relation) WHERE id=$6 RETURNING *',
      [prenom,nom,telephone,telephone_2||null,relation||null,req.params.id]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/contacts-urgence/:id', auth, async (req, res) => {
  try {
    await db('DELETE FROM contacts_urgence WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── RECHARGE CARTE ────────────────────────────────────────────────
router.post('/recharger', auth, async (req, res) => {
  const { montant, mode_paiement, reference_paiement } = req.body;
  if (!montant || montant <= 0) return res.status(400).json({ success: false, message: 'Montant invalide' });
  if (montant < 1000) return res.status(400).json({ success: false, message: 'Montant minimum : 1 000 FCFA' });
  try {
    const account = await db("SELECT * FROM mediconnect_accounts WHERE user_id=$1", [req.user.id]);
    if (!account.rows.length) return res.status(404).json({ success: false, message: 'Compte card non trouvé' });
    const a = account.rows[0];
    const solde_avant = +a.solde;
    const solde_apres = solde_avant + +montant;

    // Enregistrer la recharge
    await db(
      'INSERT INTO recharges_card (account_id,carte_id,montant,mode_paiement,reference_paiement,statut,solde_avant,solde_apres) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [a.id, a.carte_id, montant, mode_paiement||'Wave', reference_paiement||null, 'success', solde_avant, solde_apres]
    );

    // Mettre à jour le solde
    await db("UPDATE mediconnect_accounts SET solde=$1,updated_at=NOW() WHERE id=$2", [solde_apres, a.id]);
    await db("UPDATE mediconnect_cards SET solde=$1,updated_at=NOW() WHERE id=$2", [solde_apres, a.carte_id]);

    // Enregistrer la transaction
    await db(
      'INSERT INTO transactions_card (account_id,carte_id,type,montant,sens,solde_avant,solde_apres,description) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [a.id, a.carte_id, 'recharge', montant, 'credit', solde_avant, solde_apres, `Recharge via ${mode_paiement||'Wave'}`]
    );

    res.json({ success: true, data: { solde: solde_apres, montant_rechargé: montant }, message: `Recharge de ${Number(montant).toLocaleString('fr-CI')} FCFA effectuée !` });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── TRANSACTIONS ──────────────────────────────────────────────────
router.get('/transactions', auth, async (req, res) => {
  try {
    const account = await db("SELECT id FROM mediconnect_accounts WHERE user_id=$1", [req.user.id]);
    if (!account.rows.length) return res.json({ success: true, data: [] });
    const r = await db(
      'SELECT * FROM transactions_card WHERE account_id=$1 ORDER BY created_at DESC LIMIT 50',
      [account.rows[0].id]
    );
    res.json({ success: true, data: r.rows });
  } catch(e) { res.json({ success: true, data: [] }); }
});

// ── ADMIN : Gestion des cartes ────────────────────────────────────
router.get('/admin/cartes', auth, can('admin'), async (req, res) => {
  try {
    const r = await db(`
      SELECT c.*, a.prenom, a.nom, a.telephone, a.numero_compte, a.niveau
      FROM mediconnect_cards c
      LEFT JOIN mediconnect_accounts a ON a.carte_id=c.id
      ORDER BY c.created_at DESC LIMIT 500
    `);
    res.json({ success: true, data: r.rows });
  } catch(e) { res.json({ success: true, data: [] }); }
});

router.get('/admin/stats', auth, can('admin'), async (req, res) => {
  try {
    const [total, liees, solde_total, recharges_mois] = await Promise.all([
      db("SELECT COUNT(*) c FROM mediconnect_cards").catch(()=>({rows:[{c:0}]})),
      db("SELECT COUNT(*) c FROM mediconnect_cards WHERE statut='liee'").catch(()=>({rows:[{c:0}]})),
      db("SELECT COALESCE(SUM(solde),0) s FROM mediconnect_accounts").catch(()=>({rows:[{s:0}]})),
      db("SELECT COALESCE(SUM(montant),0) s FROM recharges_card WHERE date_trunc('month',created_at)=date_trunc('month',NOW())").catch(()=>({rows:[{s:0}]})),
    ]);
    res.json({ success: true, data: {
      total_cartes:     +total.rows[0]?.c || 0,
      cartes_liees:     +liees.rows[0]?.c || 0,
      cartes_disponibles: (+total.rows[0]?.c||0) - (+liees.rows[0]?.c||0),
      solde_total:      +solde_total.rows[0]?.s || 0,
      recharges_ce_mois:+recharges_mois.rows[0]?.s || 0,
    }});
  } catch(e) { res.json({ success: true, data: {} }); }
});

router.post('/admin/generer-cartes', auth, can('admin'), async (req, res) => {
  const { quantite = 10 } = req.body;
  if (quantite > 1000) return res.status(400).json({ success: false, message: 'Maximum 1000 cartes par lot' });
  try {
    const annee = new Date().getFullYear();
    const pays_code = req.body.pays_code || 'CI';
    const existing = await db("SELECT COUNT(*) c FROM mediconnect_cards WHERE numero_carte LIKE $1", [`MC-${pays_code}-%`]);
    let start = +existing.rows[0].c + 1;
    const cartes = [];
    for (let i = 0; i < quantite; i++) {
      const num = `MC-${pays_code}-${annee}-${String(start+i).padStart(6,'0')}`;
      cartes.push(num);
    }
    let created = 0;
    for (const num of cartes) {
      await db("INSERT INTO mediconnect_cards (numero_carte) VALUES ($1) ON CONFLICT DO NOTHING", [num]).catch(()=>{});
      created++;
    }
    res.json({ success: true, data: { cartes_generees: created, premier: cartes[0], dernier: cartes[cartes.length-1] }, message: `${created} cartes générées avec succès` });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/admin/comptes', auth, can('admin'), async (req, res) => {
  try {
    const r = await db(`
      SELECT a.*, c.numero_carte, c.statut AS carte_statut,
             COUNT(t.id) AS nb_transactions,
             COALESCE(SUM(CASE WHEN t.type='recharge' THEN t.montant ELSE 0 END),0) AS total_recharge
      FROM mediconnect_accounts a
      LEFT JOIN mediconnect_cards c ON c.id=a.carte_id
      LEFT JOIN transactions_card t ON t.account_id=a.id
      GROUP BY a.id, c.numero_carte, c.statut
      ORDER BY a.created_at DESC LIMIT 200
    `);
    res.json({ success: true, data: r.rows });
  } catch(e) { res.json({ success: true, data: [] }); }
});

module.exports = router;
