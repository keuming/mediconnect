#!/usr/bin/env python3
"""
Unifie la source des specialites : les routes publiques
(GET /api/public/cliniques, GET /api/public/cliniques/:id) ne
renvoyaient jamais de champ specialites, alors que rdv-site l'attend
pour afficher "Services offerts" et filtrer la recherche.
Fichier : backend/server.js
"""
import shutil
import sys
import os

PATH = "backend/server.js"

def patch(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    backup = path + ".bak46"
    shutil.copy2(path, backup)
    print(f"Sauvegarde : {backup}")

    replacements = []

    old1 = """app.get('/api/public/cliniques', async (req, res) => {
  try {
    const { q, ville, type } = req.query;
    // Fusionner cliniques MediConnect + établissements annuaire
    let sql = `
      SELECT
        c.id, c.nom, c.ville, c.adresse,
        COALESCE(c.telephone, u.telephone) AS telephone,
        COALESCE(c.email, u.email) AS email,
        c.logo, c.slogan, c.horaires, c.site_web,
        'mediconnect' AS source,
        true AS est_membre
      FROM cliniques c
      LEFT JOIN utilisateurs u ON u.id = c.user_id
      WHERE (c.is_active IS NOT false OR c.is_active IS NULL)
      UNION ALL
      SELECT
        id, nom, ville, adresse, telephone, NULL AS email,
        NULL AS logo, NULL AS slogan, NULL AS horaires, NULL AS site_web,
        'annuaire' AS source,
        false AS est_membre
      FROM etablissements_sante
      WHERE NOT EXISTS (
        SELECT 1 FROM cliniques c2 WHERE LOWER(c2.nom) = LOWER(etablissements_sante.nom)
      )
    `;"""

    new1 = """app.get('/api/public/cliniques', async (req, res) => {
  try {
    const { q, ville, type } = req.query;
    // Fusionner cliniques MediConnect + établissements annuaire.
    // specialites : agregees depuis specialites_clinique (meme table
    // alimentee a l'inscription et geree dans Parametrage) pour les
    // cliniques MediConnect ; depuis la colonne texte existante pour
    // les etablissements d'annuaire (non membres).
    let sql = `
      SELECT
        c.id, c.nom, c.ville, c.adresse,
        COALESCE(c.telephone, u.telephone) AS telephone,
        COALESCE(c.email, u.email) AS email,
        c.logo, c.slogan, c.horaires, c.site_web,
        'mediconnect' AS source,
        true AS est_membre,
        COALESCE(
          (SELECT array_agg(sc.nom ORDER BY sc.nom) FROM specialites_clinique sc
            WHERE sc.clinique_id = c.id AND sc.disponible IS NOT false),
          '{}'::text[]
        ) AS specialites
      FROM cliniques c
      LEFT JOIN utilisateurs u ON u.id = c.user_id
      WHERE (c.is_active IS NOT false OR c.is_active IS NULL)
      UNION ALL
      SELECT
        id, nom, ville, adresse, telephone, NULL AS email,
        NULL AS logo, NULL AS slogan, NULL AS horaires, NULL AS site_web,
        'annuaire' AS source,
        false AS est_membre,
        CASE WHEN specialites IS NULL OR specialites='' THEN '{}'::text[]
             ELSE string_to_array(specialites, ',') END AS specialites
      FROM etablissements_sante
      WHERE NOT EXISTS (
        SELECT 1 FROM cliniques c2 WHERE LOWER(c2.nom) = LOWER(etablissements_sante.nom)
      )
    `;"""
    replacements.append(("liste publique + specialites agrégées", old1, new1))

    old2 = """    const sql = `
      SELECT * FROM (
        SELECT
          c.id, c.nom, c.ville, c.adresse,
          COALESCE(c.telephone, u.telephone) AS telephone,
          COALESCE(c.email, u.email) AS email,
          c.logo, c.slogan, c.horaires, c.site_web,
          'mediconnect' AS source, true AS est_membre
        FROM cliniques c
        LEFT JOIN utilisateurs u ON u.id = c.user_id
        WHERE (c.is_active IS NOT false OR c.is_active IS NULL)
        UNION ALL
        SELECT
          id, nom, ville, adresse, telephone, NULL AS email,
          NULL AS logo, NULL AS slogan, NULL AS horaires, NULL AS site_web,
          'annuaire' AS source, false AS est_membre
        FROM etablissements_sante
        WHERE NOT EXISTS (
          SELECT 1 FROM cliniques c2 WHERE LOWER(c2.nom) = LOWER(etablissements_sante.nom)
        )
      ) t
      WHERE t.id = $1
      LIMIT 1
    `;"""

    new2 = """    const sql = `
      SELECT * FROM (
        SELECT
          c.id, c.nom, c.ville, c.adresse,
          COALESCE(c.telephone, u.telephone) AS telephone,
          COALESCE(c.email, u.email) AS email,
          c.logo, c.slogan, c.horaires, c.site_web,
          'mediconnect' AS source, true AS est_membre,
          COALESCE(
            (SELECT array_agg(sc.nom ORDER BY sc.nom) FROM specialites_clinique sc
              WHERE sc.clinique_id = c.id AND sc.disponible IS NOT false),
            '{}'::text[]
          ) AS specialites
        FROM cliniques c
        LEFT JOIN utilisateurs u ON u.id = c.user_id
        WHERE (c.is_active IS NOT false OR c.is_active IS NULL)
        UNION ALL
        SELECT
          id, nom, ville, adresse, telephone, NULL AS email,
          NULL AS logo, NULL AS slogan, NULL AS horaires, NULL AS site_web,
          'annuaire' AS source, false AS est_membre,
          CASE WHEN specialites IS NULL OR specialites='' THEN '{}'::text[]
               ELSE string_to_array(specialites, ',') END AS specialites
        FROM etablissements_sante
        WHERE NOT EXISTS (
          SELECT 1 FROM cliniques c2 WHERE LOWER(c2.nom) = LOWER(etablissements_sante.nom)
        )
      ) t
      WHERE t.id = $1
      LIMIT 1
    `;"""
    replacements.append(("détail publique + specialites agrégées", old2, new2))

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
