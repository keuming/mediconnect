#!/usr/bin/env python3
"""
genererLignesFactureHtml accepte desormais une couleur en parametre.
Fichier : frontend/src/pages/clinique/Dashboard.jsx
"""
import shutil
import sys
import os

PATH = "frontend/src/pages/clinique/Dashboard.jsx"

def patch(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    backup = path + ".bak53"
    shutil.copy2(path, backup)
    print(f"Sauvegarde : {backup}")

    old1 = """const COULEUR_SECTION_FACTURE = "#0A8F58";
const genererLignesFactureHtml = (lignes) => {"""
    new1 = """const genererLignesFactureHtml = (lignes, couleur = "#0A8F58") => {"""
    n1 = content.count(old1)
    if n1 != 1:
        print(f"ÉCHEC - ancre 'signature' trouvée {n1} fois (attendu: 1)")
        sys.exit(1)
    content = content.replace(old1, new1)
    print("Patché : signature genererLignesFactureHtml + couleur")

    old2 = '    <tr><td colspan="4" style="padding:8px 10px;background:${COULEUR_SECTION_FACTURE};color:#fff;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">${cat}</td></tr>'
    new2 = '    <tr><td colspan="4" style="padding:8px 10px;background:${couleur};color:#fff;font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">${cat}</td></tr>'
    n2 = content.count(old2)
    if n2 != 1:
        print(f"ÉCHEC - ancre 'utilisation couleur' trouvée {n2} fois (attendu: 1)")
        sys.exit(1)
    content = content.replace(old2, new2)
    print("Patché : utilisation du paramètre couleur")

    old3 = "    const lignesHtml = genererLignesFactureHtml(lignes);"
    new3 = '    const lignesHtml = genererLignesFactureHtml(lignes, cl?.couleur_primaire || "#0A8F58");'
    n3 = content.count(old3)
    if n3 != 2:
        print(f"ÉCHEC - ancre 'appel genererLignesFactureHtml' trouvée {n3} fois (attendu: 2)")
        sys.exit(1)
    content = content.replace(old3, new3)
    print("Patché : appel genererLignesFactureHtml (x2)")

    tmp_path = path + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        f.write(content)
    os.replace(tmp_path, path)

    print(f"\nTous les patches appliqués avec succès sur {path}")

if __name__ == "__main__":
    patch(PATH)
