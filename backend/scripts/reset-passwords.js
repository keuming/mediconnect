require('dotenv').config({ path: '../.env' }); // Correction pour trouver le .env
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db'); // Correction pour remonter d'un dossier (../)

async function resetPasswords() {
  try {
    const hash = await bcrypt.hash('demo1234', 12);
    const emails = [
      'admin@demo.ci',
      'clinique@demo.ci',
      'patient@demo.ci',
      'pharmacie@demo.ci',
      'livreur@demo.ci',
      'assureur@demo.ci',
    ];

    for (const email of emails) {
      const r = await pool.query(
        'UPDATE utilisateurs SET password=$1 WHERE email=$2 RETURNING email, role',
        [hash, email]
      );
      if (r.rows.length) {
        console.log(`✅ Reset: ${r.rows[0].email} (${r.rows[0].role})`);
      } else {
        console.log(`⚠️  Non trouvé: ${email}`);
      }
    }
    console.log('\n✅ Tous les mots de passe réinitialisés à: demo1234');
  } catch (err) {
    console.error('❌ Erreur lors du reset :', err.message);
  } finally {
    process.exit(0);
  }
}

resetPasswords();