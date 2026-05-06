require('dotenv').config();
const { Pool } = require('pg');
const bcrypt   = require('bcryptjs');
const { v4: uuid } = require('uuid');

const cleanUrl = u => u ? u.replace(/[?&]channel_binding=[^&]*/g,'') : u;
const pool = new Pool({
  connectionString: cleanUrl(process.env.DATABASE_URL),
  ssl: { rejectUnauthorized: false },
});

const seed = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('🌱 Insertion des données de démonstration MediConnect v2...\n');

    const hash = await bcrypt.hash('demo1234', 10);

    // ── Tous les rôles disponibles ────────────────────────────────
    const demos = [
      // Rôles principaux
      { role:'patient',              prenom:'Konan',       nom:'Jean',        email:'patient@demo.ci',              ville:'Cocody, Abidjan' },
      { role:'clinique',             prenom:'Polyclinique',nom:'Du Sud',      email:'clinique@demo.ci',             ville:'Cocody, Abidjan' },
      { role:'medecin',              prenom:'Kouamé',      nom:'Alice',       email:'medecin@demo.ci',              ville:'Plateau, Abidjan' },
      { role:'medecin_independant',  prenom:'Traoré',      nom:'Paul',        email:'medecin.indep@demo.ci',        ville:'Marcory, Abidjan' },
      { role:'pharmacie',            prenom:'Pharmacie',   nom:'Centrale',    email:'pharmacie@demo.ci',            ville:'Plateau, Abidjan' },
      { role:'livreur',              prenom:'Diomandé',    nom:'Koffi',       email:'livreur@demo.ci',              ville:'Treichville, Abidjan' },
      { role:'admin',                prenom:'Admin',       nom:'MediConnect', email:'admin@demo.ci',                ville:'Abidjan' },
      { role:'assureur',             prenom:'NSIA',        nom:'Assurances',  email:'assureur@demo.ci',             ville:'Plateau, Abidjan' },
      // Rôles spécialisés
      { role:'imagerie',             prenom:'Centre',      nom:"d'Imagerie",  email:'imagerie@demo.ci',             ville:'Cocody, Abidjan' },
      { role:'laboratoire',          prenom:'Labo',        nom:'Biomédical',  email:'laboratoire@demo.ci',          ville:'Plateau, Abidjan' },
    ];

    for (const u of demos) {
      // Vérifier si déjà présent
      const exists = await client.query('SELECT id FROM utilisateurs WHERE email=$1', [u.email]);
      if (exists.rows.length) {
        // Mettre à jour is_active si NULL
        await client.query('UPDATE utilisateurs SET is_active=true WHERE email=$1 AND is_active IS NULL', [u.email]);
        console.log(`  ↳ ${u.email} déjà présent, skipped`);
        continue;
      }

      const id = uuid();
      await client.query(
        `INSERT INTO utilisateurs (id,email,password,role,prenom,nom,telephone,pays_code,ville,is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true)`,
        [id, u.email, hash, u.role, u.prenom, u.nom, '+225 07 00 00 00', 'CI', u.ville]
      );
      console.log(`  ✓ ${u.role.padEnd(22)} — ${u.email}`);

      // ── Profils spécifiques ──────────────────────────────────────
      if (u.role === 'patient') {
        try {
          await client.query(
            `INSERT INTO patients (id,user_id,prenom,nom,date_naissance,groupe_sanguin,code_secret,is_active)
             VALUES ($1,$2,$3,$4,$5,$6,$7,true)
             ON CONFLICT DO NOTHING`,
            [uuid(), id, u.prenom, u.nom, '1990-05-14', 'O+', 'MC-KJ-0001']
          );
        } catch(e) { console.log('    ⚠️ Patient profil:', e.message.slice(0,50)); }
      }

      if (u.role === 'clinique') {
        const clId = uuid();
        try {
          await client.query(
            `INSERT INTO cliniques (id,user_id,nom,type,ville,adresse,email,telephone,is_active)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true)
             ON CONFLICT DO NOTHING`,
            [clId, id, 'Polyclinique du Sud', 'Polyclinique', u.ville, 'Rue des Jardins, Cocody', u.email, '+225 27 00 00 00']
          );
          console.log(`    ↳ Clinique créée: ${clId.slice(-8)}`);

          // Médecins démo dans cette clinique
          const specialites = [
            ['Alice','Kouamé','Cardiologie',25000],
            ['Paul','Traoré','Pédiatrie',18000],
            ['Fatou','Diallo','Gynécologie',22000],
          ];
          for (const [p,n,s,t] of specialites) {
            await client.query(
              `INSERT INTO medecins (id,clinique_id,prenom,nom,specialite,tarif,jours_travail,statut)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
               ON CONFLICT DO NOTHING`,
              [uuid(), clId, p, n, s, t, 'Lun,Mar,Mer,Jeu,Ven', 'Disponible']
            );
            console.log(`    ↳ Dr. ${p} ${n} (${s}) ajouté`);
          }
        } catch(e) { console.log('    ⚠️ Clinique profil:', e.message.slice(0,50)); }
      }

      if (u.role === 'medecin_independant') {
        try {
          await client.query(
            `INSERT INTO medecins (id,user_id,prenom,nom,specialite,tarif,ville,statut,jours_travail)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
             ON CONFLICT DO NOTHING`,
            [uuid(), id, u.prenom, u.nom, 'Médecine générale', 15000, u.ville, 'Disponible', 'Lun,Mar,Mer,Jeu,Ven,Sam']
          );
          console.log(`    ↳ Médecin indépendant créé`);
        } catch(e) { console.log('    ⚠️ Médecin indép.:', e.message.slice(0,50)); }
      }
    }

    // ── Activer toutes les cliniques avec is_active NULL ──────────
    await client.query('UPDATE cliniques SET is_active=true WHERE is_active IS NULL');
    await client.query('UPDATE utilisateurs SET is_active=true WHERE is_active IS NULL');

    await client.query('COMMIT');
    console.log('\n✅ Seed terminé avec succès !');
    console.log('\n📋 Comptes démo (mot de passe: demo1234)');
    console.log('─'.repeat(50));
    const rows = await pool.query('SELECT email,role FROM utilisateurs WHERE email LIKE \'%@demo.ci\' ORDER BY created_at');
    rows.rows.forEach(r => console.log(`  ${r.role.padEnd(25)} → ${r.email}`));

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Erreur seed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

seed();
