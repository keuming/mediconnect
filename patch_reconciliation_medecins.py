#!/usr/bin/env python3
"""
Reconciliation medecins <-> personnel/utilisateurs.
Fichier : backend/server.js
"""
import shutil
import sys
import os

PATH = "backend/server.js"

def patch(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    backup = path + ".bak49"
    shutil.copy2(path, backup)
    print(f"Sauvegarde : {backup}")

    replacements = []

    old1 = """app.get('/api/medecins', auth, async (req, res) => {
  try {
    const cid = req.query.clinique_id || req.user?.clinique_id;
    const r = cid
      ? await db('SELECT * FROM medecins WHERE clinique_id=$1 ORDER BY nom,prenom', [cid])
      : await db('SELECT * FROM medecins ORDER BY nom,prenom LIMIT 200');
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});"""

    new1 = """app.get('/api/medecins', auth, async (req, res) => {
  try {
    const cid = req.query.clinique_id || req.user?.clinique_id;
    // Jointure sur le compte de connexion lie (medecins.user_id), pour
    // afficher son statut sans requete separee cote frontend.
    const r = cid
      ? await db(
          `SELECT m.*, u.id AS compte_id, u.email AS compte_email, u.is_active AS compte_actif
             FROM medecins m LEFT JOIN utilisateurs u ON u.id = m.user_id
            WHERE m.clinique_id=$1 ORDER BY m.nom,m.prenom`,
          [cid]
        )
      : await db(
          `SELECT m.*, u.id AS compte_id, u.email AS compte_email, u.is_active AS compte_actif
             FROM medecins m LEFT JOIN utilisateurs u ON u.id = m.user_id
            ORDER BY m.nom,m.prenom LIMIT 200`
        );
    res.json({ success:true, data:r.rows });
  } catch(e) { res.json({ success:true, data:[] }); }
});"""
    replacements.append(("GET /api/medecins + jointure compte lié", old1, new1))

    old2 = """      } else {
        const bcrypt = require('bcryptjs');
        const hash = await bcrypt.hash(password, 10);
        await db(
          `INSERT INTO utilisateurs (id,email,password,prenom,nom,role,telephone,clinique_id,sous_role,is_active)
           VALUES (gen_random_uuid(),$1,$2,$3,$4,'clinique',$5,$6,'medecin',true)`,
          [email, hash, prenom, nom, telephone||null, req.user?.clinique_id]
        );
        compteCree = true;
      }"""

    new2 = """      } else {
        const bcrypt = require('bcryptjs');
        const hash = await bcrypt.hash(password, 10);
        // Lien bidirectionnel medecins.user_id <-> utilisateurs.medecin_id,
        // pose des la creation.
        const compteR = await db(
          `INSERT INTO utilisateurs (id,email,password,prenom,nom,role,telephone,clinique_id,sous_role,is_active,medecin_id)
           VALUES (gen_random_uuid(),$1,$2,$3,$4,'clinique',$5,$6,'medecin',true,$7) RETURNING id`,
          [email, hash, prenom, nom, telephone||null, req.user?.clinique_id, medecin.id]
        );
        await db('UPDATE medecins SET user_id=$1 WHERE id=$2', [compteR.rows[0].id, medecin.id]);
        compteCree = true;
      }"""
    replacements.append(("POST /api/medecins + lien bidirectionnel", old2, new2))

    old3 = """app.delete('/api/medecins/:id', auth, async (req, res) => {
  try { await db('DELETE FROM medecins WHERE id=$1', [req.params.id]); res.json({ success:true }); }
  catch(e) { res.status(500).json({ success:false, message:e.message }); }
});"""

    new3 = """app.delete('/api/medecins/:id', auth, async (req, res) => {
  const cid = req.user?.clinique_id;
  try {
    const m = await db('SELECT user_id FROM medecins WHERE id=$1 AND clinique_id=$2', [req.params.id, cid]);
    if (!m.rows.length) return res.status(404).json({ success:false, message:'Médecin introuvable dans votre clinique' });
    let compteDesactive = false;
    if (m.rows[0].user_id) {
      await db('UPDATE utilisateurs SET is_active=false WHERE id=$1', [m.rows[0].user_id]);
      compteDesactive = true;
    }
    await db('DELETE FROM medecins WHERE id=$1', [req.params.id]);
    res.json({ success:true, compteDesactive });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});

// ── Backfill temporaire : lie retroactivement les fiches medecins et
// comptes deja existants. Route a retirer apres usage. ──
app.post('/api/admin/backfill-liens-medecins', async (req, res) => {
  const key = req.headers['x-admin-key'];
  if (key !== 'mediconnect_dev_secret_2024')
    return res.status(403).json({ success:false, message:'Non autorise' });
  try {
    const r1 = await db(`
      UPDATE medecins m SET user_id = u.id
        FROM utilisateurs u
       WHERE u.clinique_id = m.clinique_id AND u.sous_role='medecin'
         AND LOWER(u.prenom) = LOWER(m.prenom) AND LOWER(u.nom) = LOWER(m.nom)
         AND m.user_id IS NULL
      RETURNING m.id, m.prenom, m.nom
    `);
    const r2 = await db(`
      UPDATE utilisateurs u SET medecin_id = m.id
        FROM medecins m
       WHERE m.user_id = u.id AND u.medecin_id IS NULL
      RETURNING u.id
    `);
    res.json({ success:true, medecins_lies: r1.rows.length, comptes_lies: r2.rows.length, details: r1.rows });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
});"""
    replacements.append(("DELETE /api/medecins/:id + backfill temporaire", old3, new3))

    old4 = """    const r = await db(
      `SELECT id,email,prenom,nom,telephone,sous_role,is_active,created_at
         FROM utilisateurs WHERE clinique_id=$1 AND sous_role IS NOT NULL
        ORDER BY created_at DESC`,
      [cid]
    );"""

    new4 = """    const r = await db(
      `SELECT u.id,u.email,u.prenom,u.nom,u.telephone,u.sous_role,u.is_active,u.created_at,
              m.id AS medecin_id, m.specialite AS medecin_specialite, m.tarif AS medecin_tarif
         FROM utilisateurs u LEFT JOIN medecins m ON m.id = u.medecin_id
        WHERE u.clinique_id=$1 AND u.sous_role IS NOT NULL
        ORDER BY u.created_at DESC`,
      [cid]
    );"""
    replacements.append(("GET /api/clinique/personnel + jointure fiche médecin", old4, new4))

    for name, old, new in replacements:
        n = content.count(old)
        if n != 1:
            print(f"ÉCHEC - ancre '{name}' trouvée {n} fois (attendu: 1)")
            sys.exit(1)
        content = content.replace(old, new)
        print(f"Patché : {name}")

    tmp_path = path + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        f.write(content)
    os.replace(tmp_path, path)

    print(f"\nTous les patches appliqués avec succès sur {path}")

if __name__ == "__main__":
    patch(PATH)
