const router = require('express').Router();
const { db } = require('../config/db');
const { auth } = require('../middleware/auth');

// ── BULLETINS ─────────────────────────────────────────────────────
router.get('/bulletins', auth, async (req, res) => {
  try {
    const { categorie, statut, patient_id } = req.query;
    let sql = 'SELECT * FROM bulletins WHERE 1=1'; const p = [];
    // FAILLE CONFIDENTIALITE CORRIGEE : sans ce filtre, un patient voyait
    // TOUS les bulletins de TOUS les patients (resultats labo/imagerie
    // d'inconnus). Le filtre vient de req.user (token signe), jamais
    // d'un parametre de requete que le client pourrait manipuler.
    if (req.user?.role === 'patient') {
      if (!req.user.patient_id) { return res.json({ success: true, data: [] }); }
      p.push(req.user.patient_id);
      sql += ` AND patient_id=$${p.length}`;
    } else if (req.user?.laboratoire_id) {
      // Cloisonnement labo -- avant ce correctif, un compte laboratoire
      // ne tombait dans aucune branche ci-dessous et voyait soit rien,
      // soit TOUS les bulletins de TOUS les etablissements des qu'il en
      // existait (aucun filtre applique par defaut).
      p.push(req.user.laboratoire_id);
      sql += ` AND labo_id=$${p.length}`;
      if (patient_id) { p.push(patient_id); sql += ` AND patient_id=$${p.length}`; }
    } else if (req.user?.imagerie_id) {
      p.push(req.user.imagerie_id);
      sql += ` AND imagerie_id=$${p.length}`;
      if (patient_id) { p.push(patient_id); sql += ` AND patient_id=$${p.length}`; }
    } else if (req.user?.clinique_id) {
      p.push(req.user.clinique_id);
      sql += ` AND clinique_id=$${p.length}`;
      // Filtre patient_id optionnel pour le personnel (ex: outil de
      // recherche de resultats par code dossier). Toujours EN PLUS du
      // cloisonnement clinique_id ci-dessus, jamais a sa place : le
      // personnel ne peut interroger que les patients de sa propre
      // clinique, meme en connaissant l'id d'un patient externe.
      if (patient_id) { p.push(patient_id); sql += ` AND patient_id=$${p.length}`; }
    }
    if (categorie) { p.push(categorie); sql += ` AND categorie=$${p.length}`; }
    if (statut)    { p.push(statut);    sql += ` AND statut=$${p.length}`; }
    sql += ' ORDER BY created_at DESC LIMIT 100';
    const r = await db(sql, p);
    res.json({ success: true, data: r.rows });
  } catch(e) { res.json({ success: true, data: [] }); }
});

router.post('/bulletins', auth, async (req, res) => {
  const {
    type, categorie, patient_nom, emetteur_nom, notes, rapport, fichier_url, fichier_nom, statut,
    // Fichier de PRESCRIPTION joint par le medecin a la demande -- colonnes
    // distinctes de fichier_url/fichier_nom (reservees au RESULTAT que le
    // labo/imagerie uploade plus tard via PUT). Les melanger ferait
    // ecraser la prescription par le resultat au moment de la reponse.
    fichier_prescription_url, fichier_prescription_nom,
    // Identifiant de lot -- partage par tous les examens d'un meme envoi
    // (ex: NFS + Goutte epaisse demandes ensemble). Purement declaratif :
    // aucune logique serveur n'en depend, il sert uniquement au frontend
    // a regrouper l'affichage. NULL = examen isole, comportement inchange.
    groupe_id,
  } = req.body;
  if (!type) return res.status(400).json({ success: false, message: 'Type requis' });
  try {
    // Un compte patient ne peut jamais creer un bulletin au nom d'un autre
    // patient : le patient_id vient du token signe, pas du corps de la
    // requete, meme si le champ est present dans le payload envoye.
    // Les autres roles (clinique, labo, imagerie) restent libres de
    // specifier le patient_id cible.
    const patientId = req.user?.role === 'patient'
      ? (req.user.patient_id || null)
      : (req.body.patient_id || null);
    // Un compte labo/imagerie qui cree lui-meme un bulletin depose un
    // resultat deja pret (patient de passage retrouve par code) -- pas
    // une demande a traiter -- d'ou 'traite' par defaut dans ce cas,
    // contre 'nouveau' pour une demande initiee par une clinique.
    const statutFinal = statut || ((req.user?.laboratoire_id || req.user?.imagerie_id) ? 'traite' : 'nouveau');
    // Destinataire : si c'est le labo/imagerie lui-meme qui cree le
    // bulletin, son propre id prime toujours (jamais ecrasable par le
    // corps de la requete). Sinon (clinique qui demande un examen), le
    // destinataire vient du corps -- sans ca, le bulletin reste orphelin
    // (labo_id NULL) et invisible pour tout labo, meme apres reponse.
    const laboId = req.user?.laboratoire_id || (categorie==='laboratoire' ? (req.body.labo_id||null) : null);
    const imagerieId = req.user?.imagerie_id || (categorie==='imagerie' ? (req.body.imagerie_id||null) : null);
    const r = await db(
      'INSERT INTO bulletins (id,type,categorie,patient_nom,patient_id,emetteur_nom,clinique_id,labo_id,imagerie_id,notes,rapport,fichier_url,fichier_nom,statut,fichier_prescription_url,fichier_prescription_nom,groupe_id) VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *',
      [type, categorie||'imagerie', patient_nom||null, patientId, emetteur_nom||null, req.user?.clinique_id||null, laboId, imagerieId, notes||null, rapport||null, fichier_url||null, fichier_nom||null, statutFinal, fichier_prescription_url||null, fichier_prescription_nom||null, groupe_id||null]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/bulletins/:id', auth, async (req, res) => {
  const { statut, rapport, notes, fichier_url, fichier_nom, norme } = req.body;
  try {
    const r = await db(
      "UPDATE bulletins SET statut=COALESCE($1,statut),rapport=COALESCE($2,rapport),notes=COALESCE($3,notes),fichier_url=COALESCE($4,fichier_url),fichier_nom=COALESCE($5,fichier_nom),norme=COALESCE($6,norme),updated_at=NOW() WHERE id=$7 RETURNING *",
      [statut||null, rapport||null, notes||null, fichier_url||null, fichier_nom||null, norme||null, req.params.id]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── SPÉCIALITÉS CLINIQUE ─────────────────────────────────────────
router.get('/public/specialites', async (req, res) => {
  try {
    const r = await db(`
      SELECT s.nom, COUNT(DISTINCT s.clinique_id) AS nb_cliniques,
             json_agg(DISTINCT jsonb_build_object('id',c.id,'nom',c.nom,'ville',c.ville))
               FILTER (WHERE c.id IS NOT NULL) AS cliniques
      FROM specialites_clinique s
      LEFT JOIN cliniques c ON c.id=s.clinique_id AND c.is_active IS NOT false
      WHERE s.disponible=true
      GROUP BY s.nom ORDER BY nb_cliniques DESC, s.nom
    `);
    res.json({ success: true, data: r.rows });
  } catch(e) { res.json({ success: true, data: [] }); }
});

router.get('/public/cliniques/:id/specialites', async (req, res) => {
  try {
    const r = await db(
      'SELECT * FROM specialites_clinique WHERE clinique_id=$1 AND disponible=true ORDER BY nom',
      [req.params.id]
    );
    res.json({ success: true, data: r.rows });
  } catch(e) { res.json({ success: true, data: [] }); }
});

router.get('/cliniques/specialites', auth, async (req, res) => {
  try {
    const r = await db('SELECT * FROM specialites_clinique WHERE clinique_id=$1 ORDER BY nom', [req.user?.clinique_id]);
    res.json({ success: true, data: r.rows });
  } catch(e) { res.json({ success: true, data: [] }); }
});

router.post('/cliniques/specialites', auth, async (req, res) => {
  const { nom, description, tarif_consultation } = req.body;
  if (!nom) return res.status(400).json({ success: false, message: 'Nom requis' });
  try {
    const cid = req.user?.clinique_id;
    const exists = await db('SELECT id FROM specialites_clinique WHERE clinique_id=$1 AND nom=$2', [cid, nom]);
    if (exists.rows.length) return res.status(409).json({ success: false, message: 'Spécialité déjà existante' });
    const r = await db(
      'INSERT INTO specialites_clinique (id,clinique_id,nom,description,tarif_consultation) VALUES (gen_random_uuid(),$1,$2,$3,$4) RETURNING *',
      [cid, nom, description||null, tarif_consultation||null]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/cliniques/specialites/:id', auth, async (req, res) => {
  const { nom, description, tarif_consultation, disponible } = req.body;
  try {
    const r = await db(
      'UPDATE specialites_clinique SET nom=COALESCE($1,nom),description=COALESCE($2,description),tarif_consultation=COALESCE($3::DECIMAL,tarif_consultation),disponible=COALESCE($4,disponible) WHERE id=$5 AND clinique_id=$6 RETURNING *',
      [nom||null, description||null, tarif_consultation||null, disponible??null, req.params.id, req.user?.clinique_id]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/cliniques/specialites/:id', auth, async (req, res) => {
  try {
    await db('UPDATE specialites_clinique SET disponible=false WHERE id=$1 AND clinique_id=$2', [req.params.id, req.user?.clinique_id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── PHARMACIE ─────────────────────────────────────────────────────
router.get('/pharmacie/commandes', auth, async (req, res) => {
  try {
    const { statut } = req.query;
    let sql = `SELECT c.*, u.prenom||' '||u.nom AS patient_nom, u.telephone AS contact
               FROM commandes c LEFT JOIN utilisateurs u ON u.id=c.patient_id WHERE 1=1`;
    const p = [];
    if (statut) { p.push(statut); sql += ` AND c.statut=$${p.length}`; }
    sql += ' ORDER BY c.created_at DESC LIMIT 100';
    const r = await db(sql, p);
    res.json({ success: true, data: r.rows });
  } catch(e) { res.json({ success: true, data: [] }); }
});

// ── LIVREURS ─────────────────────────────────────────────────────
router.get('/livreurs/commandes', auth, async (req, res) => {
  try {
    const lid = req.user?.id;
    const r = await db(`
      SELECT c.*, u.prenom||' '||u.nom AS patient_nom, u.telephone AS contact
      FROM commandes c LEFT JOIN utilisateurs u ON u.id=c.patient_id
      WHERE (c.livreur_id=$1 OR (c.livreur_id IS NULL AND c.statut='confirmee'))
      ORDER BY c.created_at DESC LIMIT 50
    `, [lid]);
    res.json({ success: true, data: r.rows });
  } catch(e) { res.json({ success: true, data: [] }); }
});

router.put('/livreurs/position', auth, async (req, res) => {
  res.json({ success: true, message: 'Position enregistrée' });
});

// ── PATIENTS /me ─────────────────────────────────────────────────
router.get('/patients/me', auth, async (req, res) => {
  try {
    const r = await db('SELECT * FROM patients WHERE user_id=$1 LIMIT 1', [req.user.id]);
    res.json({ success: true, data: r.rows[0]||null });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── CONSULTATIONS depuis-rdv ────────────────────────────────────
router.post('/consultations/depuis-rdv', auth, async (req, res) => {
  try {
    const { rdv_id, patient_id, diagnostic, traitement, notes,
            tension_arterielle, temperature, poids, taille,
            pathologie, age_patient, sexe_patient, gravite, ordonnance } = req.body;
    if (!diagnostic) return res.status(400).json({ success: false, message: 'Diagnostic requis' });
    const mid = req.user?.medecin_id || req.user?.id;
    const r = await db(`
      INSERT INTO consultations
        (id,patient_id,medecin_id,rdv_id,diagnostic,traitement,notes,
         tension_arterielle,temperature,poids,taille,pathologie,
         age_patient,sexe_patient,gravite,pays_code)
      VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'CI')
      RETURNING *
    `, [patient_id||null, mid, rdv_id||null, diagnostic,
        traitement||null, notes||null, tension_arterielle||null,
        temperature||null, poids||null, taille||null,
        pathologie||null, age_patient||null, sexe_patient||null, gravite||'modere']);
    if (ordonnance?.medicaments) {
      await db(
        'INSERT INTO ordonnances (id,patient_id,medecin_id,consultation_id,medicaments,posologie,duree) VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6)',
        [patient_id||null, mid, r.rows[0].id, ordonnance.medicaments, ordonnance.posologie||null, ordonnance.duree||null]
      ).catch(()=>{});
    }
    if (rdv_id) await db("UPDATE rendez_vous SET statut='termine' WHERE id=$1", [rdv_id]).catch(()=>{});
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});
// GET /api/public/recherche-specialite?q=cardiologie
router.get('/public/recherche-specialite', async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) return res.json({ success: true, data: [] });
  try {
    const [cliniquesRes, etablissementsRes] = await Promise.all([
      db(`
        SELECT DISTINCT c.id, c.nom, c.ville, c.telephone, c.adresse,
               s.nom AS specialite, s.tarif_consultation, 'clinique_mediconnect' AS source
        FROM specialites_clinique s
        JOIN cliniques c ON c.id = s.clinique_id AND c.is_active IS NOT false
        WHERE s.disponible=true AND s.nom ILIKE $1
        ORDER BY c.nom LIMIT 50
      `, [`%${q}%`]),
      db(`
        SELECT id, nom, ville, telephone, adresse, specialites, type, 'etablissement_public' AS source
        FROM etablissements_sante
        WHERE specialites ILIKE $1 AND clinique_id IS NULL
        ORDER BY nom LIMIT 50
      `, [`%${q}%`]).catch(() => ({ rows: [] })),
    ]);
    res.json({ success: true, data: {
      cliniques_mediconnect: cliniquesRes.rows,
      etablissements_publics: etablissementsRes.rows,
    }});
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ── GET /api/public/prestataires?type=&ville=&pays=&specialite= ──
// Recherche unifiee multi-types : clinique, hopital, laboratoire, imagerie, assurance, pharmacie
router.get('/public/prestataires', async (req, res) => {
  const { type, ville, pays, specialite } = req.query;
  if (!type) return res.status(400).json({ success: false, message: 'Le type de prestataire est requis' });

  const pc = pays || 'CI';
  let where = ['pays_code = $1'];
  let params = [pc];
  let idx = 2;
  if (ville) { where.push(`UPPER(ville) LIKE UPPER($${idx})`); params.push('%'+ville+'%'); idx++; }

  try {
    let rows = [];

    if (type === 'clinique' || type === 'hopital') {
      const typeFilter = type === 'hopital' ? 'Hôpital public' : 'Clinique';
      where.push(`type = $${idx}`); params.push(typeFilter); idx++;
      if (specialite) {
        const r = await db(`
          SELECT DISTINCT c.id, c.nom, c.ville, c.telephone, c.adresse, c.type,
                 s.nom AS specialite, s.tarif_consultation
          FROM cliniques c
          JOIN specialites_clinique s ON s.clinique_id = c.id AND s.disponible=true
          WHERE ${where.join(' AND ')} AND s.nom ILIKE $${idx} AND c.is_active IS NOT false
          ORDER BY c.nom LIMIT 100
        `, [...params, `%${specialite}%`]);
        rows = r.rows;
      } else {
        const r = await db(`
          SELECT id, nom, ville, telephone, adresse, type
          FROM cliniques
          WHERE ${where.join(' AND ')} AND is_active IS NOT false
          ORDER BY nom LIMIT 100
        `, params);
        rows = r.rows;
      }
    } else if (type === 'laboratoire') {
      const r = await db(`SELECT id, nom, ville, telephone, adresse FROM laboratoires WHERE ${where.join(' AND ')} ORDER BY nom LIMIT 100`, params);
      rows = r.rows;
    } else if (type === 'imagerie') {
      const r = await db(`SELECT id, nom, ville, telephone, adresse FROM imageries WHERE ${where.join(' AND ')} ORDER BY nom LIMIT 100`, params);
      rows = r.rows;
    } else if (type === 'assurance') {
      const r = await db(`SELECT id, nom, ville, telephone, adresse FROM assureurs WHERE ${where.join(' AND ')} ORDER BY nom LIMIT 100`, params);
      rows = r.rows;
    } else if (type === 'pharmacie') {
      const r = await db(`SELECT id, nom, ville, telephone, adresse FROM pharmacies WHERE ${where.join(' AND ')} ORDER BY nom LIMIT 100`, params);
      rows = r.rows;
    } else {
      return res.status(400).json({ success: false, message: 'Type de prestataire invalide' });
    }

    res.json({ success: true, data: rows, count: rows.length });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
