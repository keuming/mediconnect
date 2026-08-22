#!/usr/bin/env python3
"""
Retire le marqueur diagnostic temporaire.
Fichier : backend/server.js
"""
import shutil
import sys
import os

PATH = "backend/server.js"

def patch(path):
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    backup = path + ".bak48"
    shutil.copy2(path, backup)
    print(f"Sauvegarde : {backup}")

    old = """    const r = await db(sql, [id]);
    if (!r.rows.length) return res.status(404).json({ success: false, message: 'Etablissement introuvable' });
    res.json({ success: true, data: { ...r.rows[0], debug_version: 'PATCH_SPECIALITES_V1' } });
  } catch (e) {
    console.error('public/cliniques/:id:', e.message);
    res.status(500).json({ success: false, message: e.message, debug_error: e.message });
  }
});"""

    new = """    const r = await db(sql, [id]);
    if (!r.rows.length) return res.status(404).json({ success: false, message: 'Etablissement introuvable' });
    res.json({ success: true, data: r.rows[0] });
  } catch (e) {
    console.error('public/cliniques/:id:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});"""

    n = content.count(old)
    if n != 1:
        print(f"ÉCHEC - ancre trouvée {n} fois (attendu: 1)")
        sys.exit(1)
    content = content.replace(old, new)
    print("Patché : marqueur diagnostic retiré")

    tmp_path = path + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        f.write(content)
    os.replace(tmp_path, path)

    print(f"\nPatch appliqué avec succès sur {path}")

if __name__ == "__main__":
    patch(PATH)
