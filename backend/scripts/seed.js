require('dotenv').config();
const { Pool } = require('pg');
const bcrypt   = require('bcryptjs');
const { v4: uuid } = require('uuid');

// ─── Connexion ────────────────────────────────────────────────────────────────

const cleanUrl = u => u ? u.replace(/[?&]channel_binding=[^&]*/g, '') : u;
const connectionString = cleanUrl(process.env.DATABASE_URL);

const isLocal = !connectionString ||
  process.env.DB_HOST === 'localhost' ||
  process.env.DB_HOST === '127.0.0.1' ||
  process.env.NODE_ENV === 'development';

const useSSL = !isLocal || (connectionString && connectionString.includes('neon.tech'));

const poolConfig = { ssl: useSSL ? { rejectUnauthorized: false } : false };

if (connectionString && !isLocal) {
  poolConfig.connectionString = connectionString;
} else {
  poolConfig.user     = process.env.DB_USER;
  poolConfig.host     = process.env.DB_HOST || 'localhost';
  poolConfig.database = process.env.DB_NAME;
  poolConfig.password = String(process.env.DB_PASSWORD || '');
  poolConfig.port     = parseInt(process.env.DB_PORT) || 5432;
}

const pool = new Pool(poolConfig);

// ─── Seed ─────────────────────────────────────────────────────────────────────

const seed = async () => {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    console.log(
      '🌱 Insertion des données de démonstration MediConnect v2 sur ' +
      (isLocal ? 'DOCKER' : 'NEON') + '...\n'
    );

    const hash = await bcrypt.hash('demo1234', 10);

    // Roles valides selon le CHECK de la migration
    const demos = [
      { role: 'patient',             prenom: 'Konan',        nom: 'Jean',        email: 'patient@demo.ci',       ville: 'Cocody, Abidjan'      },
      { role: 'clinique',            prenom: 'Polyclinique', nom: 'Du Sud',      email: 'clinique@demo.ci',      ville: 'Cocody, Abidjan'      },
      { role: 'medecin_independant', prenom: 'Traore',       nom: 'Paul',        email: 'medecin.indep@demo.ci', ville: 'Marcory, Abidjan'     },
      { role: 'pharmacie',           prenom: 'Pharmacie',    nom: 'Centrale',    email: 'pharmacie@demo.ci',     ville: 'Plateau, Abidjan'     },
      { role: 'livreur',             prenom: 'Diomande',     nom: 'Koffi',       email: 'livreur@demo.ci',       ville: 'Treichville, Abidjan' },
      { role: 'admin',               prenom: 'Admin',        nom: 'MediConnect', email: 'admin@demo.ci',         ville: 'Abidjan'              },
      { role: 'assureur',            prenom: 'NSIA',         nom: 'Assurances',  email: 'assureur@demo.ci',      ville: 'Plateau, Abidjan'     },
      { role: 'imagerie',            prenom: 'Centre',       nom: "Imagerie",    email: 'imagerie@demo.ci',      ville: 'Cocody, Abidjan'      },
      { role: 'laboratoire',         prenom: 'Labo',         nom: 'Biomedical',  email: 'laboratoire@demo.ci',   ville: 'Plateau, Abidjan'     },
    ];

    for (const u of demos) {
      const exists = await client.query(
        'SELECT id FROM utilisateurs WHERE email = $1',
        [u.email]
      );

      let userId;

      if (exists.rows.length) {
        userId = exists.rows[0].id;
        await client.query(
          'UPDATE utilisateurs SET is_active = true WHERE email = $1',
          [u.email]
        );
        console.log(`  ↳ ${u.email} déjà présent, statut mis à jour`);
      } else {
        userId = uuid();
        await client.query(
          `INSERT INTO utilisateurs
             (id, email, password, role, prenom, nom, telephone, pays_code, ville, is_active)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true)`,
          [userId, u.email, hash, u.role, u.prenom, u.nom, '+225 07 00 00 00', 'CI', u.ville]
        );
        console.log(`  ✓ ${u.role.padEnd(22)} — ${u.email}`);
      }

      // ── Patient ──────────────────────────────────────────────────────────────
      if (u.role === 'patient') {
        const { rows } = await client.query(
          'SELECT id FROM patients WHERE user_id = $1', [userId]
        );
        if (!rows.length) {
          await client.query(
            `INSERT INTO patients
               (id, user_id, date_naissance, sexe, groupe_sanguin, code_secret)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [uuid(), userId, '1990-05-14', 'M', 'O+', 'MC-KJ-0001']
          );
          console.log(`  ✓ profil patient créé`);
        }
      }

      // ── Clinique ─────────────────────────────────────────────────────────────
      if (u.role === 'clinique') {
        const { rows } = await client.query(
          'SELECT id FROM cliniques WHERE user_id = $1', [userId]
        );
        if (!rows.length) {
          const clId = uuid();
          await client.query(
            `INSERT INTO cliniques
               (id, user_id, nom, type, adresse, email, telephone, is_active)
             VALUES ($1,$2,$3,$4,$5,$6,$7,true)`,
            [clId, userId, 'Polyclinique du Sud', 'Polyclinique',
             'Rue des Jardins, Cocody', u.email, '+225 27 00 00 00']
          );
          console.log(`  ✓ profil clinique créé`);

          // jours_travail est TEXT[] — passer un tableau JS, pas une string
          const medecins = [
            ['Alice', 'Kouame',  'Cardiologie', 25000],
            ['Paul',  'Traore',  'Pediatrie',   18000],
          ];
          for (const [prenom, nom, specialite, tarif] of medecins) {
            await client.query(
              `INSERT INTO medecins
                 (id, clinique_id, prenom, nom, specialite, tarif, jours_travail, statut)
               VALUES ($1,$2,$3,$4,$5,$6,$7,'Disponible')`,
              [uuid(), clId, prenom, nom, specialite, tarif,
               ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven']]  // ← tableau JS = TEXT[]
            );
          }
          console.log(`  ✓ 2 médecins créés pour la clinique`);
        }
      }

      // ── Médecin indépendant ───────────────────────────────────────────────────
      if (u.role === 'medecin_independant') {
        const { rows } = await client.query(
          'SELECT id FROM medecins_independants WHERE user_id = $1', [userId]
        );
        if (!rows.length) {
          await client.query(
            `INSERT INTO medecins_independants
               (id, user_id, prenom, nom, specialite, tarif,
                email, telephone, adresse, ville,
                jours_travail, teleconsult, deplacement, statut)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
            [
              uuid(), userId,
              'Paul', 'Traore', 'Medecine generale', 15000,
              u.email, '+225 07 11 22 33',
              'Rue du Commerce, Marcory', 'Marcory, Abidjan',
              ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],  // ← tableau JS = TEXT[]
              true,   // teleconsult
              true,   // deplacement
              'Disponible'
            ]
          );
          console.log(`  ✓ profil médecin indépendant créé`);
        }
      }

      // ── Pharmacie ─────────────────────────────────────────────────────────────
      if (u.role === 'pharmacie') {
        const { rows } = await client.query(
          'SELECT id FROM pharmacies WHERE user_id = $1', [userId]
        );
        if (!rows.length) {
          await client.query(
            `INSERT INTO pharmacies
               (id, user_id, nom, email, telephone, adresse, ville, zone_livraison_km, is_active)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true)`,
            [uuid(), userId, 'Pharmacie Centrale', u.email,
             '+225 27 33 44 55', 'Avenue Chardy, Plateau', 'Plateau, Abidjan', 15]
          );
          console.log(`  ✓ profil pharmacie créé`);
        }
      }

      // ── Livreur ───────────────────────────────────────────────────────────────
      if (u.role === 'livreur') {
        const { rows } = await client.query(
          'SELECT id FROM livreurs WHERE user_id = $1', [userId]
        );
        if (!rows.length) {
          await client.query(
            `INSERT INTO livreurs
               (id, user_id, telephone, ville, type_vehicule, statut)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [uuid(), userId, '+225 07 44 55 66', 'Treichville, Abidjan', 'Moto', 'disponible']
          );
          console.log(`  ✓ profil livreur créé`);
        }
      }

      // ── Assureur ──────────────────────────────────────────────────────────────
      if (u.role === 'assureur') {
        const { rows } = await client.query(
          'SELECT id FROM assureurs WHERE user_id = $1', [userId]
        );
        if (!rows.length) {
          await client.query(
            `INSERT INTO assureurs
               (id, user_id, nom, email, telephone, adresse, ville, type_connexion, taux_defaut)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [uuid(), userId, 'NSIA Assurances', u.email,
             '+225 27 55 66 77', 'Immeuble NSIA, Plateau', 'Plateau, Abidjan',
             'manuel', 80]
          );
          console.log(`  ✓ profil assureur créé`);
        }
      }

      // ── Imagerie ──────────────────────────────────────────────────────────────
      if (u.role === 'imagerie') {
        const { rows } = await client.query(
          'SELECT id FROM imageries WHERE user_id = $1', [userId]
        );
        if (!rows.length) {
          await client.query(
            `INSERT INTO imageries
               (id, user_id, nom, email, telephone, adresse, ville,
                equipements, is_active)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true)`,
            [uuid(), userId, "Centre d'Imagerie Medicale", u.email,
             '+225 27 66 77 88', 'Rue des Jardins, Cocody', 'Cocody, Abidjan',
             ['Scanner', 'IRM', 'Echographie', 'Radiographie']]  // ← TEXT[]
          );
          console.log(`  ✓ profil imagerie créé`);
        }
      }

      // ── Laboratoire ───────────────────────────────────────────────────────────
      if (u.role === 'laboratoire') {
        const { rows } = await client.query(
          'SELECT id FROM laboratoires WHERE user_id = $1', [userId]
        );
        if (!rows.length) {
          await client.query(
            `INSERT INTO laboratoires
               (id, user_id, nom, email, telephone, adresse, ville,
                analyses, is_active)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true)`,
            [uuid(), userId, 'Labo Biomedical Plateau', u.email,
             '+225 27 77 88 99', 'Avenue Nogues, Plateau', 'Plateau, Abidjan',
             ['Hematologie', 'Biochimie', 'Bacteriologie', 'Serologie']]  // ← TEXT[]
          );
          console.log(`  ✓ profil laboratoire créé`);
        }
      }
    }

    await client.query('COMMIT');
    console.log('\n✅ Seed terminé avec succès !');

  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('\n❌ Erreur seed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
};

seed();
