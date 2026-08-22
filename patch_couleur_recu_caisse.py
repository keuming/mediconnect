#!/usr/bin/env python3
"""
Applique couleur_primaire a l'en-tete du recu de caisse imprime.
Fichier : frontend/src/pages/clinique/Dashboard.jsx
"""
import shutil
import sys
import os

PATH = "frontend/src/pages/clinique/Dashboard.jsx"

def patch(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    backup = path + ".bak54"
    shutil.copy2(path, backup)
    print(f"Sauvegarde : {backup}")

    old = """        .header{display:flex;align-items:center;gap:14px;border-bottom:2px solid #0A8F58;padding-bottom:12px;margin-bottom:18px;}
        .logo{height:58px;object-fit:contain;}
        .cn{font-size:18px;font-weight:700;color:#065F3C;}
        .ci{font-size:11px;color:#5A7A94;}
        h1{font-size:20px;margin-bottom:4px} p{color:#5B6B78;margin-top:0}
        table{width:100%;border-collapse:collapse;margin-top:20px}
        th{text-align:left;padding:8px;border-bottom:2px solid #16211C;font-size:12px;text-transform:uppercase}
        td{padding:8px;border-bottom:1px solid #E1E7EC;font-size:13px}
        .footer{margin-top:30px;border-top:1px solid #e5e7eb;padding-top:14px;font-size:10px;color:#8BA0B5;display:flex;justify-content:space-between;}
        @media print{button{display:none;}}
      </style></head><body>
      <div class="header">
        ${cl?.logo?`<img src="${cl.logo}" class="logo"/>`:''}
        <div>
          <div class="cn">${cl?.nom||'MediConnect Africa'}</div>"""

    new = """        .header{display:flex;align-items:center;gap:14px;border-bottom:2px solid ${cl?.couleur_primaire||'#0A8F58'};padding-bottom:12px;margin-bottom:18px;}
        .logo{height:58px;object-fit:contain;}
        .cn{font-size:18px;font-weight:700;color:${cl?.couleur_primaire||'#065F3C'};}
        .ci{font-size:11px;color:#5A7A94;}
        h1{font-size:20px;margin-bottom:4px} p{color:#5B6B78;margin-top:0}
        table{width:100%;border-collapse:collapse;margin-top:20px}
        th{text-align:left;padding:8px;border-bottom:2px solid #16211C;font-size:12px;text-transform:uppercase}
        td{padding:8px;border-bottom:1px solid #E1E7EC;font-size:13px}
        .footer{margin-top:30px;border-top:1px solid #e5e7eb;padding-top:14px;font-size:10px;color:#8BA0B5;display:flex;justify-content:space-between;}
        @media print{button{display:none;}}
      </style></head><body>
      <div class="header">
        ${cl?.logo?`<img src="${cl.logo}" class="logo"/>`:''}
        <div>
          <div class="cn">${cl?.nom||'MediConnect Africa'}</div>"""

    n = content.count(old)
    if n != 1:
        print(f"ÉCHEC - ancre trouvée {n} fois (attendu: 1)")
        sys.exit(1)
    content = content.replace(old, new)
    print("Patché : couleur de marque sur reçu de caisse")

    tmp_path = path + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        f.write(content)
    os.replace(tmp_path, path)

    print(f"\nPatch appliqué avec succès sur {path}")

if __name__ == "__main__":
    patch(PATH)
