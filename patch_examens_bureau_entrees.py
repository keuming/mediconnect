#!/usr/bin/env python3
"""
Lot 5 : rend l'onglet "Examens" (deja existant, deja restreint aux
seuls bulletins - securise pour bureau_entrees) visible pour
bureau_entrees dans le dossier patient.
Fichier : frontend/src/pages/clinique/Dashboard.jsx
"""
import shutil
import sys
import os

PATH = "frontend/src/pages/clinique/Dashboard.jsx"

def patch(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    backup = path + ".bak45"
    shutil.copy2(path, backup)
    print(f"Sauvegarde : {backup}")

    old = """  const TABS = user?.sous_role === "bureau_entrees"
    ? TABS_TOUTES.filter(t => t.key==="infos" || t.key==="carte" || t.key==="factures" || t.key==="rapports")
    : TABS_TOUTES;"""
    new = """  // "examens" ajoute pour bureau_entrees : deja concu pour lui (acces
  // volontairement restreint aux SEULS bulletins, ni consultations ni
  // ordonnances), et remplace desormais l'ancienne entree de menu
  // "Resultats d'examens" retiree du menu principal.
  const TABS = user?.sous_role === "bureau_entrees"
    ? TABS_TOUTES.filter(t => t.key==="infos" || t.key==="carte" || t.key==="examens" || t.key==="factures" || t.key==="rapports")
    : TABS_TOUTES;"""

    n = content.count(old)
    if n != 1:
        print(f"ÉCHEC - ancre trouvée {n} fois (attendu: 1)")
        sys.exit(1)
    content = content.replace(old, new)
    print("Patché : onglet Examens ajouté à la visibilité bureau_entrees")

    tmp_path = path + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        f.write(content)
    os.replace(tmp_path, path)

    print(f"\nPatch appliqué avec succès sur {path}")

if __name__ == "__main__":
    patch(PATH)
