#!/usr/bin/env python3
"""
Lot 3 : refonte du menu clinique.
- Retire du menu : Spécialités, Stock, Assurances, Dossiers assurance,
  Actes & tarifs (consolidés dans Paramétrage / Pharmacie interne).
- Ajoute : Paramétrage.
- Résultats d'examens reste dans NAV.clinique (nécessaire pour
  laboratoire/radiologie) mais retiré de la visibilité de
  bureau_entrees/medecin (déplacé dans Dossiers patients à la place).
Fichier : frontend/src/components/layout/AppLayout.jsx
"""
import shutil
import sys
import os

PATH = "frontend/src/components/layout/AppLayout.jsx"

def patch(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    backup = path + ".bak2"
    shutil.copy2(path, backup)
    print(f"Sauvegarde : {backup}")

    replacements = []

    old1 = """  clinique: [
    { path:'/clinique',              icon:'📊', label:'Dashboard' },
    { path:'/clinique/planning',     icon:'📅', label:'Planning & RDV' },
    { path:'/clinique/dossiers',     icon:'👤', label:'Dossiers patients' },
    { path:'/clinique/consultation', icon:'🩺', label:'Consultation',   badge:'NEW' },
    { path:'/clinique/caisse',       icon:'💰', label:'Caisse',         badge:'NEW' },
    { path:'/clinique/facturation',  icon:'📄', label:'Gestion financière' },
    { path:'/clinique/specialites',  icon:'🩺', label:'Spécialités',    badge:'NEW' },
    { path:'/clinique/stock',        icon:'💊', label:'Stock' },
    { path:'/clinique/assurance',    icon:'🛡️', label:'Assurances' },
    { path:'/clinique/dossiers-ass', icon:'📋', label:'Dossiers assurance' },
    { path:'/clinique/stats',        icon:'📈', label:'Statistiques' },
    { path:'/clinique/resultats-examens', icon:'🔬', label:'Résultats d\\'examens' },
    { path:'/clinique/actes-tarifs', icon:'🩺', label:'Actes & tarifs' },
    { path:'/clinique/pharmacie-interne', icon:'💊', label:'Pharmacie interne' },
    { path:'/clinique/administration', icon:'👤', label:'Administration' },
  ],"""
    new1 = """  clinique: [
    { path:'/clinique',              icon:'📊', label:'Dashboard' },
    { path:'/clinique/planning',     icon:'📅', label:'Planning & RDV' },
    { path:'/clinique/dossiers',     icon:'👤', label:'Dossiers patients' },
    { path:'/clinique/consultation', icon:'🩺', label:'Consultation',   badge:'NEW' },
    { path:'/clinique/caisse',       icon:'💰', label:'Caisse',         badge:'NEW' },
    { path:'/clinique/facturation',  icon:'📄', label:'Gestion financière' },
    { path:'/clinique/stats',        icon:'📈', label:'Statistiques' },
    { path:'/clinique/resultats-examens', icon:'🔬', label:'Résultats d\\'examens' },
    { path:'/clinique/pharmacie-interne', icon:'💊', label:'Pharmacie interne' },
    { path:'/clinique/administration', icon:'👤', label:'Administration' },
    { path:'/clinique/parametrage',  icon:'⚙️', label:'Paramétrage' },
  ],"""
    replacements.append(("NAV.clinique restructuré", old1, new1))

    old2 = """  const VISIBILITE_SOUS_ROLE = {
    bureau_entrees: ['/clinique', '/clinique/planning', '/clinique/dossiers', '/clinique/caisse', '/clinique/facturation', '/clinique/specialites', '/clinique/stock', '/clinique/resultats-examens'],
    medecin:        ['/clinique', '/clinique/planning', '/clinique/dossiers', '/clinique/consultation', '/clinique/specialites', '/clinique/administration', '/clinique/stock', '/clinique/stats', '/clinique/resultats-examens'],
    finance:        ['/clinique', '/clinique/caisse', '/clinique/facturation', '/clinique/assurance', '/clinique/dossiers-ass', '/clinique/stats'],
    rh:             ['/clinique', '/clinique/administration'],
    pharmacien:     ['/clinique', '/clinique/pharmacie-interne', '/clinique/stock'],
    laboratoire:    ['/clinique', '/clinique/resultats-examens'],
    radiologie:     ['/clinique', '/clinique/resultats-examens'],
  };"""
    new2 = """  const VISIBILITE_SOUS_ROLE = {
    // Resultats d'examens retire ici (deplace dans Dossiers patients) --
    // reste dans NAV.clinique pour laboratoire/radiologie ci-dessous.
    bureau_entrees: ['/clinique', '/clinique/planning', '/clinique/dossiers', '/clinique/caisse', '/clinique/facturation'],
    medecin:        ['/clinique', '/clinique/planning', '/clinique/dossiers', '/clinique/consultation', '/clinique/administration', '/clinique/stats'],
    finance:        ['/clinique', '/clinique/caisse', '/clinique/facturation', '/clinique/parametrage', '/clinique/stats'],
    rh:             ['/clinique', '/clinique/administration'],
    pharmacien:     ['/clinique', '/clinique/pharmacie-interne'],
    laboratoire:    ['/clinique', '/clinique/resultats-examens'],
    radiologie:     ['/clinique', '/clinique/resultats-examens'],
  };"""
    replacements.append(("VISIBILITE_SOUS_ROLE mise à jour", old2, new2))

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
