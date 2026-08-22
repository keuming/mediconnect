#!/usr/bin/env python3
"""
Applique couleur_primaire aux deux impressions facture.
Fichier : frontend/src/pages/clinique/Dashboard.jsx
"""
import shutil
import sys
import os

PATH = "frontend/src/pages/clinique/Dashboard.jsx"

def patch(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    backup = path + ".bak55"
    shutil.copy2(path, backup)
    print(f"Sauvegarde : {backup}")

    old1 = """        .header{display:flex;align-items:center;gap:14px;border-bottom:2px solid #0A8F58;padding-bottom:12px;margin-bottom:18px;}
        .logo{height:58px;object-fit:contain;}
        h2{color:#0A8F58;font-size:16px;margin:0 0 16px;text-align:center;text-transform:uppercase;letter-spacing:1px;}
        .champ{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e5e7eb;font-size:14px;}
        .label{color:#8BA0B5;}
        .valeur{font-weight:700;}
        table{width:100%;border-collapse:collapse;margin-top:20px;font-size:13px;}
        th{text-align:left;color:#8BA0B5;font-size:11px;text-transform:uppercase;padding-bottom:6px;border-bottom:2px solid #1a2e25;}
        .total{font-size:20px;color:#0A8F58;font-weight:900;text-align:right;margin-top:10px;}
        .footer{margin-top:30px;border-top:1px solid #e5e7eb;padding-top:14px;font-size:10px;color:#8BA0B5;display:flex;justify-content:space-between;}
        @media print{button{display:none;}}
      </style></head><body>
      <div class="header">
        ${cl?.logo?`<img src="${cl.logo}" class="logo"/>`:''}"""

    new1 = """        .header{display:flex;align-items:center;gap:14px;border-bottom:2px solid ${cl?.couleur_primaire||'#0A8F58'};padding-bottom:12px;margin-bottom:18px;}
        .logo{height:58px;object-fit:contain;}
        h2{color:${cl?.couleur_primaire||'#0A8F58'};font-size:16px;margin:0 0 16px;text-align:center;text-transform:uppercase;letter-spacing:1px;}
        .champ{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e5e7eb;font-size:14px;}
        .label{color:#8BA0B5;}
        .valeur{font-weight:700;}
        table{width:100%;border-collapse:collapse;margin-top:20px;font-size:13px;}
        th{text-align:left;color:#8BA0B5;font-size:11px;text-transform:uppercase;padding-bottom:6px;border-bottom:2px solid #1a2e25;}
        .total{font-size:20px;color:${cl?.couleur_primaire||'#0A8F58'};font-weight:900;text-align:right;margin-top:10px;}
        .footer{margin-top:30px;border-top:1px solid #e5e7eb;padding-top:14px;font-size:10px;color:#8BA0B5;display:flex;justify-content:space-between;}
        @media print{button{display:none;}}
      </style></head><body>
      <div class="header">
        ${cl?.logo?`<img src="${cl.logo}" class="logo"/>`:''}"""

    n1 = content.count(old1)
    if n1 != 1:
        print(f"ÉCHEC - ancre imprimerFactureEmise trouvée {n1} fois (attendu: 1)")
        sys.exit(1)
    content = content.replace(old1, new1)
    print("Patché : couleur de marque sur imprimerFactureEmise")

    old2 = """        h2{color:#0A8F58;font-size:16px;margin:0 0 16px;text-align:center;text-transform:uppercase;letter-spacing:1px;}
        .champ{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e5e7eb;font-size:14px;}
        .label{color:#8BA0B5;}
        .valeur{font-weight:700;}
        table{width:100%;border-collapse:collapse;margin-top:20px;font-size:13px;}
        th{text-align:left;color:#8BA0B5;font-size:11px;text-transform:uppercase;padding-bottom:6px;border-bottom:2px solid #1a2e25;}
        .totaux{margin-top:16px;}
        .totaux .champ{font-size:15px;}
        .total{font-size:20px;color:#0A8F58;font-weight:900;text-align:right;margin-top:10px;}
        @media print{button{display:none;}}
      </style></head><body>
      <div class="header" style="display:flex;align-items:center;gap:14px;border-bottom:2px solid #0A8F58;padding-bottom:12px;margin-bottom:18px;">
        ${cl?.logo?`<img src="${cl.logo}" style="height:58px;object-fit:contain;"/>`:''}"""

    new2 = """        h2{color:${cl?.couleur_primaire||'#0A8F58'};font-size:16px;margin:0 0 16px;text-align:center;text-transform:uppercase;letter-spacing:1px;}
        .champ{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e5e7eb;font-size:14px;}
        .label{color:#8BA0B5;}
        .valeur{font-weight:700;}
        table{width:100%;border-collapse:collapse;margin-top:20px;font-size:13px;}
        th{text-align:left;color:#8BA0B5;font-size:11px;text-transform:uppercase;padding-bottom:6px;border-bottom:2px solid #1a2e25;}
        .totaux{margin-top:16px;}
        .totaux .champ{font-size:15px;}
        .total{font-size:20px;color:${cl?.couleur_primaire||'#0A8F58'};font-weight:900;text-align:right;margin-top:10px;}
        @media print{button{display:none;}}
      </style></head><body>
      <div class="header" style="display:flex;align-items:center;gap:14px;border-bottom:2px solid ${cl?.couleur_primaire||'#0A8F58'};padding-bottom:12px;margin-bottom:18px;">
        ${cl?.logo?`<img src="${cl.logo}" style="height:58px;object-fit:contain;"/>`:''}"""

    n2 = content.count(old2)
    if n2 != 1:
        print(f"ÉCHEC - ancre imprimerFactureResume trouvée {n2} fois (attendu: 1)")
        sys.exit(1)
    content = content.replace(old2, new2)
    print("Patché : couleur de marque sur imprimerFactureResume")

    old3 = "          <div style=\"font-size:16px;font-weight:700;color:#065F3C;\">${cl?.nom||'MediConnect Africa'}</div>"
    new3 = "          <div style=\"font-size:16px;font-weight:700;color:${cl?.couleur_primaire||'#065F3C'};\">${cl?.nom||'MediConnect Africa'}</div>"
    n3 = content.count(old3)
    if n3 != 2:
        print(f"ÉCHEC - ancre nom clinique trouvée {n3} fois (attendu: 2)")
        sys.exit(1)
    content = content.replace(old3, new3)
    print(f"Patché : nom clinique dans en-tête facture (x{n3})")

    tmp_path = path + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        f.write(content)
    os.replace(tmp_path, path)

    print(f"\nTous les patches appliqués avec succès sur {path}")

if __name__ == "__main__":
    patch(PATH)
