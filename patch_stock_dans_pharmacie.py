#!/usr/bin/env python3
"""
Lot 4 : deplace le module Stock dans Pharmacie interne, sous forme
d'onglet (Ordonnances / Stock), plutot qu'entree de menu separee.
Fichier : frontend/src/pages/clinique/Dashboard.jsx
"""
import shutil
import sys
import os

PATH = "frontend/src/pages/clinique/Dashboard.jsx"

def patch(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    backup = path + ".bak44"
    shutil.copy2(path, backup)
    print(f"Sauvegarde : {backup}")

    replacements = []

    old1 = """function PagePharmacieInterne() {
  const qc = useQueryClient();
  const [ordonnanceActive, setOrdonnanceActive] = useState(null);
  const [lignesDevis, setLignesDevis] = useState([]);"""
    new1 = """function PagePharmacieInterne() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("ordonnances");
  const [ordonnanceActive, setOrdonnanceActive] = useState(null);
  const [lignesDevis, setLignesDevis] = useState([]);"""
    replacements.append(("état tab Pharmacie interne", old1, new1))

    old2 = """  return (
    <div>
      <PageHeader title="💊 Pharmacie interne" subtitle="Ordonnances reçues, devis et dispensation" />
      <Panel>"""
    new2 = """  return (
    <div>
      <PageHeader title="💊 Pharmacie interne" subtitle="Ordonnances reçues, devis, dispensation et stock" />
      <div style={{ display:"flex", gap:4, background:C.input, borderRadius:10, padding:4, marginBottom:20 }}>
        {[["ordonnances","Ordonnances"],["stock","Stock"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)}
            style={{ flex:1, background:tab===k?C.hover:"transparent", border:"none", borderRadius:8, padding:"9px 4px", cursor:"pointer", fontFamily:"inherit", color:tab===k?C.text:C.muted, fontSize:16, fontWeight:tab===k?700:400 }}>
            {l}
          </button>
        ))}
      </div>
      {tab==="stock" ? <PageStock /> : (
      <>
      <Panel>"""
    replacements.append(("en-tête + onglets Pharmacie interne", old2, new2))

    old3 = """        <Btn style={{width:"100%"}} loading={devisMut.isPending} onClick={()=>devisMut.mutate()}>Valider le devis</Btn>
      </Modal>
    </div>
  );
}"""
    new3 = """        <Btn style={{width:"100%"}} loading={devisMut.isPending} onClick={()=>devisMut.mutate()}>Valider le devis</Btn>
      </Modal>
      </>
      )}
    </div>
  );
}"""
    replacements.append(("fermeture conditionnelle onglets", old3, new3))

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
