#!/usr/bin/env python3
"""
Applique couleur_primaire a imprimerFacture (prise en charge).
Fichier : frontend/src/pages/clinique/Dashboard.jsx
"""
import shutil
import sys
import os

PATH = "frontend/src/pages/clinique/Dashboard.jsx"

def patch(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    backup = path + ".bak56"
    shutil.copy2(path, backup)
    print(f"Sauvegarde : {backup}")

    old = """        .header{display:flex;align-items:center;gap:16px;padding-bottom:12px;border-bottom:3px solid #0A8F58;margin-bottom:18px;}
        .logo{height:58px;object-fit:contain;}
        .cn{font-size:18px;font-weight:700;color:#065F3C;}
        .ci{font-size:11px;color:#5A7A94;}
        h2{color:#0A8F58;font-size:16px;margin:0 0 14px;text-align:center;text-transform:uppercase;letter-spacing:1px;}
        .warn{background:#FEF3C7;border:1px solid #F59E0B;color:#92400E;border-radius:8px;padding:8px 12px;font-size:11px;text-align:center;margin-bottom:14px;}
        .meta{display:flex;justify-content:space-between;gap:16px;margin-bottom:16px;}
        .box{background:#E8F8F1;border-radius:8px;padding:12px;flex:1;}
        .lbl{font-size:10px;color:#8BA0B5;font-weight:700;text-transform:uppercase;letter-spacing:.5px;}
        table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:12px;}
        th{background:#065F3C;color:#fff;padding:8px;text-align:left;font-size:11px;text-transform:uppercase;}
        td{padding:8px;border-bottom:1px solid #e5e7eb;}
        .r{text-align:right;}
        .tot{background:#f8f9fa;font-weight:700;}
        .final{background:#0A8F58;color:#fff;font-size:15px;font-weight:800;}"""

    new = """        .header{display:flex;align-items:center;gap:16px;padding-bottom:12px;border-bottom:3px solid ${cl?.couleur_primaire||'#0A8F58'};margin-bottom:18px;}
        .logo{height:58px;object-fit:contain;}
        .cn{font-size:18px;font-weight:700;color:${cl?.couleur_primaire||'#065F3C'};}
        .ci{font-size:11px;color:#5A7A94;}
        h2{color:${cl?.couleur_primaire||'#0A8F58'};font-size:16px;margin:0 0 14px;text-align:center;text-transform:uppercase;letter-spacing:1px;}
        .warn{background:#FEF3C7;border:1px solid #F59E0B;color:#92400E;border-radius:8px;padding:8px 12px;font-size:11px;text-align:center;margin-bottom:14px;}
        .meta{display:flex;justify-content:space-between;gap:16px;margin-bottom:16px;}
        .box{background:#E8F8F1;border-radius:8px;padding:12px;flex:1;}
        .lbl{font-size:10px;color:#8BA0B5;font-weight:700;text-transform:uppercase;letter-spacing:.5px;}
        table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:12px;}
        th{background:${cl?.couleur_primaire||'#065F3C'};color:#fff;padding:8px;text-align:left;font-size:11px;text-transform:uppercase;}
        td{padding:8px;border-bottom:1px solid #e5e7eb;}
        .r{text-align:right;}
        .tot{background:#f8f9fa;font-weight:700;}
        .final{background:${cl?.couleur_primaire||'#0A8F58'};color:#fff;font-size:15px;font-weight:800;}"""

    n = content.count(old)
    if n != 1:
        print(f"ÉCHEC - ancre trouvée {n} fois (attendu: 1)")
        sys.exit(1)
    content = content.replace(old, new)
    print("Patché : couleur de marque sur imprimerFacture")

    tmp_path = path + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        f.write(content)
    os.replace(tmp_path, path)

    print(f"\nPatch appliqué avec succès sur {path}")

if __name__ == "__main__":
    patch(PATH)
