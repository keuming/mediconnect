require('dotenv').config();
const { pool } = require('../config/db');
const bcrypt   = require('bcryptjs');
const { v4: uuid } = require('uuid');

const seed = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('🌱 Insertion des données de démonstration...');

    const hash = await bcrypt.hash('demo1234', 12);

    const demos = [
      { id: uuid(), role: 'patient',   prenom: 'Konan',    nom: 'Jean',    email: 'patient@demo.ci',   ville: 'Cocody, Abidjan' },
      { id: uuid(), role: 'clinique',  prenom: 'Polyclinique', nom: 'Du Sud', email: 'clinique@demo.ci',  ville: 'Cocody, Abidjan' },
      { id: uuid(), role: 'pharmacie', prenom: 'Pharmacie', nom: 'Centrale', email: 'pharmacie@demo.ci', ville: 'Plateau, Abidjan' },
      { id: uuid(), role: 'livreur',   prenom: 'Diomandé',  nom: 'Koffi',   email: 'livreur@demo.ci',   ville: 'Treichville, Abidjan' },
      { id: uuid(), role: 'admin',     prenom: 'Admin',     nom: 'MediConnect', email: 'admin@demo.ci', ville: 'Abidjan' },
      { id: uuid(), role: 'assureur',  prenom: 'NSIA',      nom: 'Assurances', email: 'assureur@demo.ci', ville: 'Plateau, Abidjan' },
    ];

    for (const u of demos) {
      // Vérifier si existe déjà
      const exists = await client.query('SELECT id FROM utilisateurs WHERE email=$1', [u.email]);
      if (exists.rows.length) { console.log(`  ↳ ${u.email} déjà présent, skipped`); continue; }

      await client.query(
        `INSERT INTO utilisateurs (id,email,password,role,prenom,nom,telephone,pays_code,ville) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [u.id, u.email, hash, u.role, u.prenom, u.nom, '+225 07 00 00 00', 'CI', u.ville]
      );
      console.log(`  ✓ ${u.role} — ${u.email}`);

      // Profils spécifiques
      if (u.role === 'patient') {
        await client.query(
          `INSERT INTO patients (user_id, date_naissance, sexe, groupe_sanguin, allergies, code_secret) VALUES ($1,$2,$3,$4,$5,$6)`,
          [u.id, '1990-05-14', 'M', 'O+', ['Pénicilline'], 'MC-KJ-0001']
        );
      } else if (u.role === 'clinique') {
        const clId = uuid();
        await client.query(
          `INSERT INTO cliniques (id,user_id,nom,type,numero_agrement,assurances,is_verified) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [clId, u.id, 'Polyclinique du Sud', 'Polyclinique', 'AGR-2024-001', ['NSIA','Allianz','AXA','CNAM'], true]
        );
        // Ajouter des médecins démo
        const specialites = [['Alice','Kouamé','Cardiologie',25000],['Paul','Traoré','Pédiatrie',18000],['Fatou','Diallo','Gynécologie',22000]];
        for (const [p,n,s,t] of specialites) {
          await client.query(
            `INSERT INTO medecins (id,clinique_id,prenom,nom,specialite,tarif,jours_travail,statut) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [uuid(), clId, p, n, s, t, ['Lundi','Mardi','Mercredi','Jeudi','Vendredi'], 'Disponible']
          );
        }
      } else if (u.role === 'pharmacie') {
        await client.query(
          `INSERT INTO pharmacies (user_id,nom,numero_autorisation,zone_livraison_km,is_verified) VALUES ($1,$2,$3,$4,$5)`,
          [u.id, 'Pharmacie Centrale', 'AUTO-2024-001', 15, true]
        );
      } else if (u.role === 'livreur') {
        await client.query(
          `INSERT INTO livreurs (user_id,type_vehicule,numero_permis,zones,statut) VALUES ($1,$2,$3,$4,$5)`,
          [u.id, 'Moto', 'CI-2020-001', ['Cocody','Plateau','Treichville'], 'disponible']
        );
      } else if (u.role === 'assureur') {
        await client.query(
          `INSERT INTO assureurs (user_id,nom,type_connexion,numero_agrement,taux_defaut) VALUES ($1,$2,$3,$4,$5)`,
          [u.id, 'NSIA Assurances CI', 'api', 'CIMA-2024-001', 80]
        );
      }
    }

    await client.query('COMMIT');
    console.log('\n✅ Données de démonstration insérées avec succès !');
    console.log('\n📧 Comptes disponibles (mot de passe : demo1234) :');
    demos.forEach(d => console.log(`   ${d.role.padEnd(10)} → ${d.email}`));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur seed:', err.message);
    throw err;
  } finally {
    client.release();
    pool.end();
  }
};

seed();
