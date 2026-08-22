#!/usr/bin/env python3
"""
Ajoute un selecteur de couleur dans Profil & Logo.
Fichier : frontend/src/pages/clinique/Dashboard.jsx
"""
import shutil
import sys
import os

PATH = "frontend/src/pages/clinique/Dashboard.jsx"

def patch(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    backup = path + ".bak52"
    shutil.copy2(path, backup)
    print(f"Sauvegarde : {backup}")

    replacements = []

    old1 = "  const [form, setForm] = React.useState({ slogan:'', adresse_complete:'', horaires:'', site_web:'', telephone:'', adresse:'', ville:'' });\n"
    new1 = "  const [form, setForm] = React.useState({ slogan:'', adresse_complete:'', horaires:'', site_web:'', telephone:'', adresse:'', ville:'', couleur_primaire:'#0A8F58' });\n"
    replacements.append(("state form + couleur_primaire", old1, new1))

    old2 = "      setForm({ slogan:d.slogan||'', adresse_complete:d.adresse_complete||'', horaires:d.horaires||'', site_web:d.site_web||'', telephone:d.telephone||'', adresse:d.adresse||'', ville:d.ville||'' });\n"
    new2 = "      setForm({ slogan:d.slogan||'', adresse_complete:d.adresse_complete||'', horaires:d.horaires||'', site_web:d.site_web||'', telephone:d.telephone||'', adresse:d.adresse||'', ville:d.ville||'', couleur_primaire:d.couleur_primaire||'#0A8F58' });\n"
    replacements.append(("préremplissage form + couleur_primaire", old2, new2))

    old3 = "                <div style={{display:'flex',alignItems:'center',gap:10,paddingBottom:8,borderBottom:'2px solid #0A8F58'}}>"
    new3 = "                <div style={{display:'flex',alignItems:'center',gap:10,paddingBottom:8,borderBottom:`2px solid ${form.couleur_primaire}`}}>"
    replacements.append(("aperçu en-tête utilise couleur_primaire", old3, new3))

    old4 = """            <h3 style={{fontSize:20,fontWeight:700,color:C.text,marginBottom:16}}>Informations affichees</h3>
            {[
              {label:'Téléphone',key:'telephone',ph:'Ex: 27 22 47 55 57'},"""
    new4 = """            <h3 style={{fontSize:20,fontWeight:700,color:C.text,marginBottom:16}}>Informations affichees</h3>
            <div style={{marginBottom:14}}>
              <label style={{fontSize:14,color:C.muted,display:'block',marginBottom:5,fontWeight:700}}>COULEUR DE MARQUE (IMPRIMABLES)</label>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <input type="color" value={form.couleur_primaire} onChange={e=>setForm(p=>({...p,couleur_primaire:e.target.value}))}
                  style={{width:56,height:40,padding:0,border:`1px solid ${C.border}`,borderRadius:8,cursor:'pointer',background:'transparent'}}/>
                <span style={{fontSize:15,color:C.dim,fontFamily:'monospace'}}>{form.couleur_primaire}</span>
              </div>
              <div style={{fontSize:12,color:C.dim,marginTop:6}}>Utilisée pour les titres de section et l'en-tête des factures, reçus, rapports et ordonnances imprimés.</div>
            </div>
            {[
              {label:'Téléphone',key:'telephone',ph:'Ex: 27 22 47 55 57'},"""
    replacements.append(("sélecteur de couleur dans Informations affichées", old4, new4))

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
