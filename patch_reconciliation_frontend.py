#!/usr/bin/env python3
"""
Frontend de la reconciliation medecins <-> personnel.
Fichier : frontend/src/pages/clinique/Dashboard.jsx
"""
import shutil
import sys
import os

PATH = "frontend/src/pages/clinique/Dashboard.jsx"

def patch(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    backup = path + ".bak50"
    shutil.copy2(path, backup)
    print(f"Sauvegarde : {backup}")

    replacements = []

    old1 = '                    <Badge color={{ Disponible:"green", "En consultation":"teal", Absent:"red" }[m.statut]||"gray"}>{m.statut}</Badge>\n                  </div>'
    new1 = ('                    <Badge color={{ Disponible:"green", "En consultation":"teal", Absent:"red" }[m.statut]||"gray"}>{m.statut}</Badge>\n'
            '                    <Badge color={m.compte_id ? (m.compte_actif ? "green" : "amber") : "gray"} style={{marginLeft:6}}>\n'
            '                      {m.compte_id ? (m.compte_actif ? "🔑 Compte actif" : "🔒 Compte désactivé") : "❌ Pas de compte"}\n'
            '                    </Badge>\n'
            '                  </div>')
    replacements.append(("badge compte lié sur carte médecin", old1, new1))

    old2 = """                { key:"prenom", label:"Nom", render:(v,row)=><span style={{fontWeight:700}}>{row.prenom} {row.nom}</span> },
                { key:"email", label:"Email" },"""
    new2 = """                { key:"prenom", label:"Nom", render:(v,row)=>(
                  <div>
                    <span style={{fontWeight:700}}>{row.prenom} {row.nom}</span>
                    {row.medecin_id && <div style={{fontSize:12,color:C.dim}}>🩺 {row.medecin_specialite||"—"}{row.medecin_tarif?` · ${fmt(row.medecin_tarif)} F`:""}</div>}
                  </div>
                ) },
                { key:"email", label:"Email" },"""
    replacements.append(("affichage spécialité/tarif liés Personnel RH", old2, new2))

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
