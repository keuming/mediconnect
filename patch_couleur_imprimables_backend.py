#!/usr/bin/env python3
"""
Outil de gestion de la couleur des imprimables : ajoute
cliniques.couleur_primaire, editable via Profil & Logo, lue par toutes
les impressions.
Fichier : backend/server.js
"""
import shutil
import sys
import os

PATH = "backend/server.js"

def patch(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    backup = path + ".bak51"
    shutil.copy2(path, backup)
    print(f"Sauvegarde : {backup}")

    replacements = []

    old1 = "    await db(`ALTER TABLE stock ADD COLUMN IF NOT EXISTS prix_subventionne DECIMAL(12,2)`);"
    new1 = ("    await db(`ALTER TABLE stock ADD COLUMN IF NOT EXISTS prix_subventionne DECIMAL(12,2)`);\n"
            "    // Couleur de marque pour les imprimables (facture, recu, rapport,\n"
            "    // ordonnance...) -- '#0A8F58' = vert actuellement code en dur partout.\n"
            "    await db(`ALTER TABLE cliniques ADD COLUMN IF NOT EXISTS couleur_primaire VARCHAR(7) DEFAULT '#0A8F58'`);")
    replacements.append(("colonne couleur_primaire", old1, new1))

    old2 = """app.post('/api/clinique/logo', auth, async (req, res) => {
  try {
    const { logo, slogan, adresse_complete, horaires, site_web, telephone, adresse, ville } = req.body;
    const cid = req.user?.clinique_id;
    if (!cid) return res.status(400).json({ success: false, message: 'clinique_id requis' });

    // Le logo est desormais optionnel a la sauvegarde : si absent, on
    // conserve celui deja enregistre (permet de mettre a jour les
    // coordonnees seules, sans re-uploader une image a chaque fois).
    if (logo && logo.length > 3000000)
      return res.status(400).json({ success: false, message: 'Logo trop volumineux (max 2MB)' });

    const r = await db(
      `UPDATE cliniques SET
         logo=COALESCE($1,logo), slogan=COALESCE($2,slogan),
         adresse_complete=COALESCE($3,adresse_complete), horaires=COALESCE($4,horaires),
         site_web=COALESCE($5,site_web), telephone=COALESCE($6,telephone),
         adresse=COALESCE($7,adresse), ville=COALESCE($8,ville)
       WHERE id=$9
       RETURNING id, nom, logo, slogan, adresse_complete, horaires, site_web, telephone, adresse, ville`,
      [logo||null, slogan||null, adresse_complete||null, horaires||null, site_web||null,
       telephone||null, adresse||null, ville||null, cid]
    );
    res.json({ success: true, data: r.rows[0], message: 'Profil mis à jour avec succès' });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});"""

    new2 = """app.post('/api/clinique/logo', auth, async (req, res) => {
  try {
    const { logo, slogan, adresse_complete, horaires, site_web, telephone, adresse, ville, couleur_primaire } = req.body;
    const cid = req.user?.clinique_id;
    if (!cid) return res.status(400).json({ success: false, message: 'clinique_id requis' });

    if (logo && logo.length > 3000000)
      return res.status(400).json({ success: false, message: 'Logo trop volumineux (max 2MB)' });
    if (couleur_primaire && !/^#[0-9A-Fa-f]{6}$/.test(couleur_primaire))
      return res.status(400).json({ success: false, message: 'Couleur invalide (format attendu : #RRGGBB)' });

    const r = await db(
      `UPDATE cliniques SET
         logo=COALESCE($1,logo), slogan=COALESCE($2,slogan),
         adresse_complete=COALESCE($3,adresse_complete), horaires=COALESCE($4,horaires),
         site_web=COALESCE($5,site_web), telephone=COALESCE($6,telephone),
         adresse=COALESCE($7,adresse), ville=COALESCE($8,ville),
         couleur_primaire=COALESCE($9,couleur_primaire)
       WHERE id=$10
       RETURNING id, nom, logo, slogan, adresse_complete, horaires, site_web, telephone, adresse, ville, couleur_primaire`,
      [logo||null, slogan||null, adresse_complete||null, horaires||null, site_web||null,
       telephone||null, adresse||null, ville||null, couleur_primaire||null, cid]
    );
    res.json({ success: true, data: r.rows[0], message: 'Profil mis à jour avec succès' });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});"""
    replacements.append(("POST /api/clinique/logo + couleur_primaire", old2, new2))

    old3 = """    const r = await db(
      `SELECT id, nom, adresse, adresse_complete, ville, telephone, email,
              logo, slogan, horaires, site_web, created_at
       FROM cliniques WHERE id=$1`, [cid]
    );
    res.json({ success: true, data: r.rows[0] || null });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});"""

    new3 = """    const r = await db(
      `SELECT id, nom, adresse, adresse_complete, ville, telephone, email,
              logo, slogan, horaires, site_web, created_at, couleur_primaire
       FROM cliniques WHERE id=$1`, [cid]
    );
    res.json({ success: true, data: r.rows[0] || null });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});"""
    replacements.append(("GET /api/clinique/profil + couleur_primaire", old3, new3))

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
