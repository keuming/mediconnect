const router = require('express').Router();
const { query } = require('../config/db');
const { auth } = require('../middleware/auth');

const init = async () => {
  await query(`CREATE TABLE IF NOT EXISTS cliniques (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, nom VARCHAR(200), type VARCHAR(100) DEFAULT 'Clinique',
    adresse TEXT, ville VARCHAR(100), telephone VARCHAR(30),
    email VARCHAR(200), assurances TEXT[], is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`).catch(e => console.error('Table cliniques:', e.message));
};
init();

router.get('/', auth, async (req, res) => {
  try {
    const r = await query('SELECT c.*, u.ville, u.adresse, u.telephone FROM cliniques c LEFT JOIN utilisateurs u ON u.id=c.user_id ORDER BY c.nom');
    res.json({ success: true, data: r.rows });
  } catch(err) {
    try {
      const r2 = await query('SELECT * FROM cliniques ORDER BY nom');
      res.json({ success: true, data: r2.rows });
    } catch(e) { res.json({ success: true, data: [] }); }
  }
});

router.get('/stats', auth, async (req, res) => {
  try {
    const cliniqueId = req.user?.clinique_id;
    const [med, rdv, pat] = await Promise.all([
      query('SELECT COUNT(*) as count FROM medecins WHERE clinique_id=$1 AND statut=$2', [cliniqueId,'Disponible']).catch(()=>({rows:[{count:0}]})),
      query("SELECT COUNT(*) as count FROM rendez_vous WHERE clinique_id=$1 AND date_rdv>=date_trunc('month',CURRENT_DATE)", [cliniqueId]).catch(()=>({rows:[{count:0}]})),
      query("SELECT COUNT(*) as count FROM patients WHERE clinique_id=$1 AND created_at>=date_trunc('month',CURRENT_DATE)", [cliniqueId]).catch(()=>({rows:[{count:0}]})),
    ]);
    res.json({ success:true, data:{
      medecins_actifs: med.rows[0]?.count||0,
      rdv_ce_mois: rdv.rows[0]?.count||0,
      patients_mois: pat.rows[0]?.count||0,
    }});
  } catch(err) {
    res.json({ success:true, data:{ medecins_actifs:0, rdv_ce_mois:0, patients_mois:0 } });
  }
});

module.exports = router;
