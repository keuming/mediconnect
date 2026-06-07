// routes/patients_mobile.js — v2
// Routes patient pour l'application mobile MediConnect
const router = require('express').Router();
const { db }  = require('../config/db');
const { auth } = require('../middleware/auth');
const { v4: uuid } = require('uuid');

// ─── Calcul IMC ───────────────────────────────────────────────────
const calcIMC = (poids, taille) => {
  if (!poids || !taille || taille <= 0) return null;
  return Math.round((poids / Math.pow(taille / 100, 2)) * 100) / 100;
};

// ─── PROFIL PATIENT ───────────────────────────────────────────────

// GET /api/patients/profil
router.get('/profil', auth, async (req, res) => {
  try {
    const r = await db(`
      SELECT u.id, u.email, u.prenom, u.nom, u.telephone, u.ville, u.adresse,
             u.pays_code, u.date_naissance, u.groupe_sanguin,
             u.taille, u.poids, u.imc, u.maladies_chroniques,
             p.id AS patient_id, p.code_secret, p.antecedents, p.allergies,
             p.assurance, p.numero_police
      FROM utilisateurs u
      LEFT JOIN patients p ON p.user_id = u.id
      WHERE u.id = $1 LIMIT 1
    `, [req.user.id]);
    res.json({ success: true, data: r.rows[0] || null });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// PUT /api/patients/profil — mettre à jour le profil
router.put('/profil', auth, async (req, res) => {
  const {
    prenom, nom, telephone, adresse, email,
    pays_code, ville, date_naissance,
    groupe_sanguin, taille, poids,
    maladies_chroniques, antecedents, allergies,
    assurance, numero_police,
  } = req.body;

  const imc = calcIMC(poids, taille);

  try {
    // Mise à jour utilisateurs
    await db(`
      UPDATE utilisateurs SET
        prenom              = COALESCE($1,  prenom),
        nom                 = COALESCE($2,  nom),
        telephone           = COALESCE($3,  telephone),
        adresse             = COALESCE($4,  adresse),
        pays_code           = COALESCE($5,  pays_code),
        ville               = COALESCE($6,  ville),
        date_naissance      = COALESCE($7,  date_naissance),
        groupe_sanguin      = COALESCE($8,  groupe_sanguin),
        taille              = COALESCE($9,  taille),
        poids               = COALESCE($10, poids),
        imc                 = COALESCE($11, imc),
        maladies_chroniques = COALESCE($12, maladies_chroniques)
      WHERE id = $13
    `, [prenom||null, nom||null, telephone||null, adresse||null,
        pays_code||null, ville||null,
        date_naissance ? new Date(date_naissance) : null,
        groupe_sanguin||null,
        taille ? parseFloat(taille) : null,
        poids  ? parseFloat(poids)  : null,
        imc,
        maladies_chroniques ? (Array.isArray(maladies_chroniques) ? maladies_chroniques : [maladies_chroniques]) : null,
        req.user.id]);

    // Mise à jour patients (si profil patient existe)
    await db(`
      UPDATE patients SET
        prenom              = COALESCE($1,  prenom),
        nom                 = COALESCE($2,  nom),
        telephone           = COALESCE($3,  telephone),
        ville               = COALESCE($4,  ville),
        groupe_sanguin      = COALESCE($5,  groupe_sanguin),
        taille              = COALESCE($6,  taille),
        poids               = COALESCE($7,  poids),
        imc                 = COALESCE($8,  imc),
        maladies_chroniques = COALESCE($9,  maladies_chroniques),
        antecedents         = COALESCE($10, antecedents),
        allergies           = COALESCE($11, allergies),
        assurance           = COALESCE($12, assurance),
        numero_police       = COALESCE($13, numero_police),
        updated_at          = NOW()
      WHERE user_id = $14
    `, [prenom||null, nom||null, telephone||null, ville||null,
        groupe_sanguin||null,
        taille ? parseFloat(taille) : null,
        poids  ? parseFloat(poids)  : null,
        imc,
        maladies_chroniques ? (Array.isArray(maladies_chroniques) ? maladies_chroniques : [maladies_chroniques]) : null,
        antecedents||null, allergies||null,
        assurance||null, numero_police||null,
        req.user.id]);

    // Sync avec mediconnect_accounts si existe
    await db(`
      UPDATE mediconnect_accounts SET
        prenom              = COALESCE($1, prenom),
        nom                 = COALESCE($2, nom),
        telephone           = COALESCE($3, telephone),
        ville               = COALESCE($4, ville),
        pays_code           = COALESCE($5, pays_code),
        groupe_sanguin      = COALESCE($6, groupe_sanguin),
        taille              = COALESCE($7, taille),
        poids               = COALESCE($8, poids),
        imc                 = COALESCE($9, imc),
        maladies_chroniques = COALESCE($10, maladies_chroniques),
        updated_at          = NOW()
      WHERE user_id = $11
    `, [prenom||null, nom||null, telephone||null, ville||null,
        pays_code||null, groupe_sanguin||null,
        taille ? parseFloat(taille) : null,
        poids  ? parseFloat(poids)  : null,
        imc,
        maladies_chroniques ? (Array.isArray(maladies_chroniques) ? maladies_chroniques : [maladies_chroniques]) : null,
        req.user.id]).catch(()=>{});

    // Retourner le profil mis à jour
    const updated = await db(`
      SELECT u.*, p.antecedents, p.allergies, p.assurance, p.numero_police
      FROM utilisateurs u
      LEFT JOIN patients p ON p.user_id=u.id
      WHERE u.id=$1
    `, [req.user.id]);

    const { password: _, ...userData } = updated.rows[0] || {};
    res.json({ success: true, data: userData, message: 'Profil mis à jour' });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── CARTE MEDICONNECT ────────────────────────────────────────────

// GET /api/patients/carte
router.get('/carte', auth, async (req, res) => {
  try {
    const r = await db(`
      SELECT ma.*, mc.numero_carte, mc.statut AS carte_statut, mc.solde, mc.qr_code_data,
             u.taille, u.poids, u.imc, u.groupe_sanguin, u.maladies_chroniques
      FROM mediconnect_accounts ma
      LEFT JOIN mediconnect_cards mc ON mc.id = ma.carte_id
      LEFT JOIN utilisateurs u ON u.id = ma.user_id
      WHERE ma.user_id = $1 LIMIT 1
    `, [req.user.id]);
    if (!r.rows.length) return res.json({ success: true, data: null });
    const acc = r.rows[0];
    const createdAt = acc.created_at ? new Date(acc.created_at) : new Date();
    const validite  = new Date(createdAt.setFullYear(createdAt.getFullYear() + 4));
    res.json({ success: true, data: {
      id:                  acc.id,
      numero:              acc.numero_carte,
      nom_complet:         `${acc.prenom} ${acc.nom}`,
      validite:            validite.toLocaleDateString('fr-FR', { month:'2-digit', year:'2-digit' }),
      statut:              acc.carte_statut === 'liee' ? 'active' : 'en_cours',
      solde:               acc.solde || 0,
      taille:              acc.taille,
      poids:               acc.poids,
      imc:                 acc.imc || calcIMC(acc.poids, acc.taille),
      groupe_sanguin:      acc.groupe_sanguin,
      maladies_chroniques: acc.maladies_chroniques || [],
    }});
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST /api/patients/carte/commander
router.post('/carte/commander', auth, async (req, res) => {
  try {
    const exists = await db('SELECT id FROM mediconnect_accounts WHERE user_id=$1', [req.user.id]);
    if (exists.rows.length) return res.status(409).json({ success: false, message: 'Vous avez déjà un compte MediConnect Card' });
    const user = await db('SELECT * FROM utilisateurs WHERE id=$1', [req.user.id]);
    const u    = user.rows[0];
    if (!u) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
    const carte     = await db("SELECT id, numero_carte FROM mediconnect_cards WHERE statut='non_liee' ORDER BY created_at LIMIT 1");
    const carteId   = carte.rows[0]?.id || null;
    const numCarte  = carte.rows[0]?.numero_carte || null;
    const numCompte = 'MCA-' + Date.now().toString(36).toUpperCase();
    const imc       = calcIMC(u.poids, u.taille);
    const acc = await db(`
      INSERT INTO mediconnect_accounts
        (id,user_id,numero_compte,carte_id,numero_carte,prenom,nom,telephone,email,
         ville,pays_code,date_naissance,groupe_sanguin,taille,poids,imc,maladies_chroniques)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      RETURNING *
    `, [uuid(), req.user.id, numCompte, carteId, numCarte,
        u.prenom||'', u.nom||'', u.telephone||null, u.email||null,
        u.ville||null, u.pays_code||'CI', u.date_naissance||null,
        u.groupe_sanguin||null,
        u.taille ? parseFloat(u.taille) : null,
        u.poids  ? parseFloat(u.poids)  : null,
        imc, u.maladies_chroniques||null]);
    if (carteId) await db("UPDATE mediconnect_cards SET statut='en_cours', updated_at=NOW() WHERE id=$1", [carteId]);
    res.status(201).json({ success: true, data: acc.rows[0], message: 'Commande de carte enregistrée !' });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── FAMILLE ─────────────────────────────────────────────────────

// GET /api/patients/famille
router.get('/famille', auth, async (req, res) => {
  try {
    const r = await db(`
      SELECT f.*, mc.numero_carte, mc.statut AS carte_statut
      FROM famille_cartes f
      LEFT JOIN mediconnect_cards mc ON mc.id = f.carte_id
      WHERE f.user_principal_id = $1 ORDER BY f.created_at
    `, [req.user.id]);
    res.json({ success: true, data: r.rows.map(m => ({ ...m, carte_active: m.carte_statut === 'liee' })) });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST /api/patients/famille/membre
router.post('/famille/membre', auth, async (req, res) => {
  const { prenom, nom, date_naissance, statut_famille, email } = req.body;
  if (!prenom || !nom || !statut_famille)
    return res.status(400).json({ success: false, message: 'Prénom, nom et statut requis' });
  if (statut_famille === 'enfant') {
    if (!date_naissance) return res.status(400).json({ success: false, message: 'Date de naissance requise pour un enfant' });
    const age = Math.floor((Date.now() - new Date(date_naissance).getTime()) / (1000*60*60*24*365.25));
    if (age > 18) return res.status(400).json({ success: false, message: `Un enfant doit avoir 18 ans ou moins (âge : ${age} ans)` });
  }
  try {
    const count = await db('SELECT COUNT(*) c FROM famille_cartes WHERE user_principal_id=$1', [req.user.id]);
    if (+count.rows[0].c >= 10) return res.status(400).json({ success: false, message: 'Maximum 10 membres par famille' });
    if (['pere','mere'].includes(statut_famille)) {
      const dup = await db('SELECT id FROM famille_cartes WHERE user_principal_id=$1 AND statut_famille=$2', [req.user.id, statut_famille]);
      if (dup.rows.length) return res.status(409).json({ success: false, message: `Un(e) ${statut_famille === 'pere' ? 'père' : 'mère'} est déjà enregistré(e)` });
    }
    const carte   = await db("SELECT id FROM mediconnect_cards WHERE statut='non_liee' ORDER BY created_at LIMIT 1");
    const carteId = carte.rows[0]?.id || null;
    const r = await db(`
      INSERT INTO famille_cartes (id,user_principal_id,carte_id,prenom,nom,date_naissance,statut_famille,email)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [uuid(), req.user.id, carteId, prenom, nom, date_naissance||null, statut_famille, email||null]);
    if (carteId) await db("UPDATE mediconnect_cards SET statut='en_cours', updated_at=NOW() WHERE id=$1", [carteId]);
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── MÉDICAMENTS ──────────────────────────────────────────────────

// GET /api/patients/medicaments
router.get('/medicaments', auth, async (req, res) => {
  try {
    const { search } = req.query;
    let sql = 'SELECT * FROM medicaments_catalogue WHERE is_active=true'; const p = [];
    if (search) { p.push(`%${search}%`); sql += ` AND (nom ILIKE $${p.length} OR dci ILIKE $${p.length})`; }
    sql += ' ORDER BY nom LIMIT 200';
    const r = await db(sql, p);
    res.json({ success: true, data: r.rows });
  } catch(e) { res.json({ success: true, data: [] }); }
});

// POST /api/patients/medicament/commander
router.post('/medicament/commander', auth, async (req, res) => {
  const { medicament_id, medicament_nom, quantite, adresse_livraison } = req.body;
  if (!medicament_nom) return res.status(400).json({ success: false, message: 'Médicament requis' });
  try {
    const r = await db(`
      INSERT INTO commandes (id,patient_id,adresse_livraison,nombre_articles,medicament_nom,medicament_details,statut)
      VALUES ($1,$2,$3,$4,$5,$6,'en_attente') RETURNING *
    `, [uuid(), req.user.id, adresse_livraison||null, quantite||1,
        medicament_nom, JSON.stringify({ medicament_id, medicament_nom, quantite: quantite||1 })]);
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// GET /api/patients/commandes
router.get('/commandes', auth, async (req, res) => {
  try {
    const r = await db('SELECT * FROM commandes WHERE patient_id=$1 ORDER BY created_at DESC LIMIT 50', [req.user.id]);
    res.json({ success: true, data: r.rows });
  } catch(e) { res.json({ success: true, data: [] }); }
});

// ─── PHARMACIES DE GARDE ──────────────────────────────────────────

// GET /api/public/pharmacies-garde
router.get('/pharmacies-garde', async (req, res) => {
  try {
    const { pays_code, ville } = req.query;
    let sql = "SELECT * FROM pharmacies WHERE est_garde=true AND is_active=true"; const p = [];
    if (pays_code) { p.push(pays_code);     sql += ` AND pays_code=$${p.length}`; }
    if (ville)     { p.push(`%${ville}%`);  sql += ` AND ville ILIKE $${p.length}`; }
    sql += ' ORDER BY nom LIMIT 100';
    const r = await db(sql, p);
    res.json({ success: true, data: r.rows });
  } catch(e) { res.json({ success: true, data: [] }); }
});

// ─── DOSSIER MÉDICAL ──────────────────────────────────────────────

// GET /api/patients/dossier
router.get('/dossier', auth, async (req, res) => {
  try {
    const uid = req.user.id;
    const [notes, traitements, examens, ordonnances] = await Promise.all([
      db(`SELECT nd.*, u.prenom||' '||u.nom AS medecin FROM notes_dossier nd LEFT JOIN utilisateurs u ON u.id=nd.medecin_id WHERE nd.patient_user_id=$1 AND nd.type='consultation' ORDER BY nd.created_at DESC LIMIT 50`, [uid]).catch(()=>({rows:[]})),
      db(`SELECT nd.*, u.prenom||' '||u.nom AS medecin FROM notes_dossier nd LEFT JOIN utilisateurs u ON u.id=nd.medecin_id WHERE nd.patient_user_id=$1 AND nd.type='traitement' ORDER BY nd.created_at DESC LIMIT 50`, [uid]).catch(()=>({rows:[]})),
      db(`SELECT nd.*, u.prenom||' '||u.nom AS medecin FROM notes_dossier nd LEFT JOIN utilisateurs u ON u.id=nd.medecin_id WHERE nd.patient_user_id=$1 AND nd.type IN ('examen','analyse') ORDER BY nd.created_at DESC LIMIT 50`, [uid]).catch(()=>({rows:[]})),
      db(`SELECT * FROM ordonnances WHERE patient_id=$1 ORDER BY created_at DESC LIMIT 20`, [uid]).catch(()=>({rows:[]})),
    ]);
    res.json({ success: true, data: { notes: notes.rows, traitements: traitements.rows, examens: examens.rows, ordonnances: ordonnances.rows } });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST /api/patients/dossier/note
router.post('/dossier/note', auth, async (req, res) => {
  const { type, contenu, date } = req.body;
  if (!contenu) return res.status(400).json({ success: false, message: 'Contenu requis' });
  try {
    const r = await db(`
      INSERT INTO notes_dossier (id,patient_user_id,medecin_id,type,contenu,date_note)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
    `, [uuid(), req.user.id, req.user.medecin_id||null, type||'consultation', contenu, date ? new Date(date) : new Date()]);
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST /api/patients/ordonnances
router.post('/ordonnances', auth, async (req, res) => {
  const { medicament, posologie, duree, note } = req.body;
  if (!medicament) return res.status(400).json({ success: false, message: 'Médicament requis' });
  try {
    const r = await db(`
      INSERT INTO ordonnances (id,patient_id,medicaments,posologie,duree,notes_ord,uploaded_by)
      VALUES ($1,$2,$3,$4,$5,$6,'patient') RETURNING *
    `, [uuid(), req.user.id, medicament, posologie||null, duree||null, note||null]);
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── MÉDECINS CONSEILS ────────────────────────────────────────────

// GET /api/public/medecins-conseils
router.get('/medecins-conseils', async (req, res) => {
  try {
    const r = await db(`
      SELECT m.*, u.email FROM medecins m
      LEFT JOIN utilisateurs u ON u.id=m.user_id
      WHERE (m.role_mc='medecin_conseil' OR u.role IN ('medecin_independant','medecin_conseil'))
        AND m.statut='Disponible'
      ORDER BY m.note_moyenne DESC NULLS LAST, m.nom LIMIT 100
    `);
    res.json({ success: true, data: r.rows });
  } catch(e) { res.json({ success: true, data: [] }); }
});

// POST /api/patients/demande-conseil
router.post('/demande-conseil', auth, async (req, res) => {
  const { medecin_id, message } = req.body;
  if (!medecin_id) return res.status(400).json({ success: false, message: 'Médecin requis' });
  try {
    const exists = await db("SELECT id FROM demandes_medecin_conseil WHERE patient_id=$1 AND medecin_id=$2 AND statut='en_attente'", [req.user.id, medecin_id]);
    if (exists.rows.length) return res.status(409).json({ success: false, message: 'Une demande est déjà en cours pour ce médecin' });
    const r = await db(`
      INSERT INTO demandes_medecin_conseil (id,patient_id,medecin_id,message)
      VALUES ($1,$2,$3,$4) RETURNING *
    `, [uuid(), req.user.id, medecin_id, message||null]);
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── ASSURANCES ───────────────────────────────────────────────────

// GET /api/public/assureurs
router.get('/assureurs', async (req, res) => {
  try {
    const r = await db("SELECT * FROM assureurs_partenaires WHERE is_active=true ORDER BY nom");
    res.json({ success: true, data: r.rows });
  } catch(e) { res.json({ success: true, data: [] }); }
});

// POST /api/patients/quotation-assurance
router.post('/quotation-assurance', auth, async (req, res) => {
  const { assureur_id, message } = req.body;
  if (!assureur_id) return res.status(400).json({ success: false, message: 'Assureur requis' });
  try {
    const [user, assureur] = await Promise.all([
      db('SELECT * FROM utilisateurs WHERE id=$1', [req.user.id]),
      db('SELECT * FROM assureurs_partenaires WHERE id=$1', [assureur_id]),
    ]);
    if (!assureur.rows.length) return res.status(404).json({ success: false, message: 'Assureur introuvable' });
    const u   = user.rows[0];
    const ref = 'QUO-' + Date.now().toString(36).toUpperCase();
    const r   = await db(`
      INSERT INTO quotations_assurance (id,reference,patient_id,patient_nom,assureur_id,assureur_nom,message)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
    `, [uuid(), ref, req.user.id, `${u?.prenom||''} ${u?.nom||''}`.trim(), assureur_id, assureur.rows[0].nom, message||null]);
    res.status(201).json({ success: true, data: r.rows[0], message: 'Demande de quotation envoyée !' });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── ABONNEMENT ───────────────────────────────────────────────────

// GET /api/patients/abonnement
router.get('/abonnement', auth, async (req, res) => {
  try {
    const r = await db("SELECT * FROM abonnements WHERE patient_id=$1 AND statut='actif' ORDER BY created_at DESC LIMIT 1", [req.user.id]);
    res.json({ success: true, data: r.rows[0] || null });
  } catch(e) { res.json({ success: true, data: null }); }
});

// POST /api/patients/abonnement/payer
router.post('/abonnement/payer', auth, async (req, res) => {
  const { plan, mode_paiement, reference_paiement } = req.body;
  const PLANS = { mensuel:{prix:2500,duree:30}, trimestriel:{prix:6500,duree:90}, annuel:{prix:20000,duree:365} };
  const p = PLANS[plan];
  if (!p) return res.status(400).json({ success: false, message: 'Plan invalide' });
  try {
    const fin = new Date(Date.now() + p.duree * 24 * 60 * 60 * 1000);
    await db("UPDATE abonnements SET statut='expire' WHERE patient_id=$1 AND statut='actif'", [req.user.id]);
    const r = await db(`
      INSERT INTO abonnements (id,patient_id,plan,prix,date_debut,date_fin,mode_paiement,reference_paiement,statut)
      VALUES ($1,$2,$3,$4,NOW(),$5,$6,$7,'actif') RETURNING *
    `, [uuid(), req.user.id, plan, p.prix, fin, mode_paiement||'Wave', reference_paiement||null]);
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
