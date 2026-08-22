#!/usr/bin/env python3
"""
Applique couleur_primaire a imprimerRapportMedical, 
imprimerRapportConsultation, et imprimerOrdonnance.
Fichier : frontend/src/pages/clinique/Dashboard.jsx
"""
import shutil
import sys
import os

PATH = "frontend/src/pages/clinique/Dashboard.jsx"

def patch(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    backup = path + ".bak57"
    shutil.copy2(path, backup)
    print(f"Sauvegarde : {backup}")

    old1 = """        .header{display:flex;align-items:center;gap:16px;padding-bottom:12px;border-bottom:3px solid #0A8F58;margin-bottom:18px;}
        .logo{height:58px;object-fit:contain;}
        .cn{font-size:18px;font-weight:700;color:#065F3C;}
        .ci{font-size:11px;color:#5A7A94;}
        h2{color:#0A8F58;font-size:16px;margin:0 0 14px;text-align:center;text-transform:uppercase;letter-spacing:1px;}
        h3{color:#065F3C;font-size:13px;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin:22px 0 10px;}"""
    new1 = """        .header{display:flex;align-items:center;gap:16px;padding-bottom:12px;border-bottom:3px solid ${cl?.couleur_primaire||'#0A8F58'};margin-bottom:18px;}
        .logo{height:58px;object-fit:contain;}
        .cn{font-size:18px;font-weight:700;color:${cl?.couleur_primaire||'#065F3C'};}
        .ci{font-size:11px;color:#5A7A94;}
        h2{color:${cl?.couleur_primaire||'#0A8F58'};font-size:16px;margin:0 0 14px;text-align:center;text-transform:uppercase;letter-spacing:1px;}
        h3{color:${cl?.couleur_primaire||'#065F3C'};font-size:13px;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #e5e7eb;padding-bottom:6px;margin:22px 0 10px;}"""
    n1 = content.count(old1)
    if n1 != 1:
        print(f"ÉCHEC - ancre 'rapport synthèse' trouvée {n1} fois (attendu: 1)")
        sys.exit(1)
    content = content.replace(old1, new1)
    print("Patché : couleur de marque sur imprimerRapportMedical")

    old2 = """        .header{display:flex;align-items:center;gap:16px;padding-bottom:12px;border-bottom:3px solid #0A8F58;margin-bottom:18px;}
        .logo{height:58px;object-fit:contain;}
        .cn{font-size:18px;font-weight:700;color:#065F3C;}
        .ci{font-size:11px;color:#5A7A94;}
        h2{color:#0A8F58;font-size:16px;margin:0 0 14px;text-align:center;text-transform:uppercase;letter-spacing:1px;}
        .meta{display:flex;justify-content:space-between;gap:16px;margin-bottom:16px;}
        .box{background:#E8F8F1;border-radius:8px;padding:12px;flex:1;}
        .lbl{font-size:10px;color:#8BA0B5;font-weight:700;text-transform:uppercase;letter-spacing:.5px;}
        .warn{background:#FEF2F2;border:1px solid #FCA5A5;color:#991B1B;border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:14px;}
        .section{margin-bottom:16px;}
        .section-lbl{font-size:11px;color:#8BA0B5;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;}"""
    new2 = """        .header{display:flex;align-items:center;gap:16px;padding-bottom:12px;border-bottom:3px solid ${cl?.couleur_primaire||'#0A8F58'};margin-bottom:18px;}
        .logo{height:58px;object-fit:contain;}
        .cn{font-size:18px;font-weight:700;color:${cl?.couleur_primaire||'#065F3C'};}
        .ci{font-size:11px;color:#5A7A94;}
        h2{color:${cl?.couleur_primaire||'#0A8F58'};font-size:16px;margin:0 0 14px;text-align:center;text-transform:uppercase;letter-spacing:1px;}
        .meta{display:flex;justify-content:space-between;gap:16px;margin-bottom:16px;}
        .box{background:#E8F8F1;border-radius:8px;padding:12px;flex:1;}
        .lbl{font-size:10px;color:#8BA0B5;font-weight:700;text-transform:uppercase;letter-spacing:.5px;}
        .warn{background:#FEF2F2;border:1px solid #FCA5A5;color:#991B1B;border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:14px;}
        .section{margin-bottom:16px;}
        .section-lbl{font-size:11px;color:#8BA0B5;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;}"""
    n2 = content.count(old2)
    if n2 != 1:
        print(f"ÉCHEC - ancre 'rapport consultation' trouvée {n2} fois (attendu: 1)")
        sys.exit(1)
    content = content.replace(old2, new2)
    print("Patché : couleur de marque sur imprimerRapportConsultation")

    old3 = """        .header{display:flex;align-items:center;gap:16px;padding-bottom:12px;border-bottom:3px solid #0A8F58;margin-bottom:20px;}
        .logo{height:60px;object-fit:contain;}
        .clinique-nom{font-size:18px;font-weight:700;color:#065F3C;}
        .clinique-info{font-size:11px;color:#5A7A94;}
        h2{color:#0A8F58;font-size:16px;margin:0 0 16px;text-align:center;text-transform:uppercase;letter-spacing:1px;}
        .section{margin-bottom:14px;}
        .label{font-size:11px;color:#8BA0B5;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px;}
        .value{font-size:14px;color:#1a2e25;font-weight:500;}
        .patient{background:#E8F8F1;border-radius:8px;padding:12px;margin-bottom:16px;}
        .medicament{background:#f8f9fa;border-left:3px solid #0A8F58;padding:12px;border-radius:4px;margin-bottom:10px;}"""
    new3 = """        .header{display:flex;align-items:center;gap:16px;padding-bottom:12px;border-bottom:3px solid ${cl?.couleur_primaire||'#0A8F58'};margin-bottom:20px;}
        .logo{height:60px;object-fit:contain;}
        .clinique-nom{font-size:18px;font-weight:700;color:${cl?.couleur_primaire||'#065F3C'};}
        .clinique-info{font-size:11px;color:#5A7A94;}
        h2{color:${cl?.couleur_primaire||'#0A8F58'};font-size:16px;margin:0 0 16px;text-align:center;text-transform:uppercase;letter-spacing:1px;}
        .section{margin-bottom:14px;}
        .label{font-size:11px;color:#8BA0B5;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px;}
        .value{font-size:14px;color:#1a2e25;font-weight:500;}
        .patient{background:#E8F8F1;border-radius:8px;padding:12px;margin-bottom:16px;}
        .medicament{background:#f8f9fa;border-left:3px solid ${cl?.couleur_primaire||'#0A8F58'};padding:12px;border-radius:4px;margin-bottom:10px;}"""
    n3 = content.count(old3)
    if n3 != 1:
        print(f"ÉCHEC - ancre 'ordonnance' trouvée {n3} fois (attendu: 1)")
        sys.exit(1)
    content = content.replace(old3, new3)
    print("Patché : couleur de marque sur imprimerOrdonnance")

    tmp_path = path + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        f.write(content)
    os.replace(tmp_path, path)

    print(f"\nTous les patches appliqués avec succès sur {path}")

if __name__ == "__main__":
    patch(PATH)
