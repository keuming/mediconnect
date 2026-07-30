'use strict';

/**
 * factureAuto.js — MediConnect Africa / CSN
 *
 * Genere automatiquement la facture d'une consultation :
 *   1. idempotent  : si une facture existe deja pour la consultation, on la renvoie
 *   2. lignes      : actes de la consultation (table de liaison, colonne JSON, ou payload)
 *   3. ventilation : part assurance / part patient selon la prise en charge
 *   4. numerotation: FAC-YY-00001 par clinique et par annee, sans collision
 *
 * Tous les montants sont des ENTIERS en FCFA (XOF n'a pas de decimales).
 */

const {
  resolveTable,
  pickColumn,
  buildInsert,
} = require('../helpers/dbIntrospect');

/* ------------------------------------------------------------------ */
/* Candidats de schema — ordre = priorite                              */
/* ------------------------------------------------------------------ */

const T = {
  factures:      ['factures', 'facture'],
  lignes:        ['facture_lignes', 'factures_lignes', 'lignes_facture', 'facture_details'],
  consultations: ['consultations'],
  // Source primaire : porte deja la ventilation calculee et un statut.
  pecActes:      ['prise_en_charge_actes'],
  consultActes:  ['consultation_actes', 'consultations_actes', 'actes_consultation'],
  actes:         ['actes_medicaux', 'nomenclature_actes', 'actes', 'nomenclature'],
  priseEnCharge: ['prises_en_charge', 'prise_en_charge', 'prises_charge'],
  patients:      ['patients'],
};

const C = {
  numero:        ['numero', 'numero_facture', 'reference', 'ref'],
  totalBrut:     ['montant_total', 'total', 'montant', 'montant_brut'],
  // ticket_moder = ticket moderateur = part restant a la charge du patient
  partPatient:   ['ticket_moder', 'ticket_moderateur', 'part_patient', 'montant_patient', 'reste_a_charge'],
  partAssurance: ['montant_assur', 'part_assurance', 'montant_assurance', 'montant_pris_en_charge'],
  statut:        ['statut', 'status', 'etat'],
  dateFacture:   ['date_facture', 'date_emission', 'date_creation'],
  createdAt:     ['created_at', 'date_creation', 'cree_le'],
  tauxPec:       ['taux', 'taux_prise_en_charge', 'taux_couverture', 'pourcentage'],
  plafond:       ['plafond', 'plafond_montant', 'montant_plafond'],
  tarif:         ['tarif', 'prix', 'montant', 'tarif_base'],
  libelle:       ['libelle', 'designation', 'nom', 'description'],
  codeActe:      ['code', 'code_acte'],
};

/* ------------------------------------------------------------------ */
/* Utilitaires                                                         */
/* ------------------------------------------------------------------ */

const toInt = (v) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? n : 0;
};

class FactureError extends Error {
  constructor(message, code, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/* ------------------------------------------------------------------ */
/* 1. Facture existante ?                                              */
/* ------------------------------------------------------------------ */

async function trouverFactureExistante(client, metaFactures, consultationId) {
  const colConsult = pickColumn(metaFactures, ['consultation_id']);
  if (!colConsult) return null;
  const { rows } = await client.query(
    `SELECT * FROM "${metaFactures.name}" WHERE "${colConsult}" = $1 LIMIT 1`,
    [consultationId]
  );
  return rows[0] || null;
}

/* ------------------------------------------------------------------ */
/* 2. Actes de la consultation                                         */
/* ------------------------------------------------------------------ */

/**
 * Trois sources, dans l'ordre :
 *   a) actesFournis  (payload de la requete)
 *   b) table de liaison consultation_actes JOIN actes
 *   c) colonne JSON/JSONB "actes" sur consultations
 */
async function chargerActes(client, consultationId, consultation, actesFournis) {
  if (Array.isArray(actesFournis) && actesFournis.length) {
    return actesFournis.map((a) => ({
      code: a.code || a.code_acte || null,
      libelle: a.libelle || a.designation || 'Acte medical',
      tarif: toInt(a.tarif ?? a.prix ?? a.montant),
      quantite: toInt(a.quantite ?? a.qte ?? 1) || 1,
      taux: a.taux === undefined ? null : Number(a.taux),
      part_assurance: null,
      part_patient: null,
      pec_id: null,
    }));
  }

  // Source primaire : prise_en_charge_actes. Elle est auto-portante
  // (code_acte, libelle_acte, prix_unitaire) et contient deja la
  // ventilation, donc on ne recalcule rien et on ne joint pas
  // actes_medicaux -- acte_id etant nullable, un JOIN perdrait des lignes.
  const metaPec = await resolveTable(client, T.pecActes);
  if (metaPec) {
    const { rows } = await client.query(
      `SELECT id, code_acte, libelle_acte, quantite, prix_unitaire,
              taux_assurance, part_assurance, part_patient, statut
         FROM "${metaPec.name}"
        WHERE consultation_id = $1
        ORDER BY created_at ASC`,
      [consultationId]
    );
    // On facture en priorite ce qui est marque 'a_facturer' ; a defaut
    // (relance apres regeneration forcee) on reprend toutes les lignes.
    const aFacturer = rows.filter((r) => r.statut === 'a_facturer');
    const retenues = aFacturer.length ? aFacturer : rows;
    if (retenues.length) {
      return retenues.map((r) => ({
        code: r.code_acte,
        libelle: r.libelle_acte || 'Acte medical',
        tarif: toInt(r.prix_unitaire),
        quantite: toInt(r.quantite) || 1,
        taux: r.taux_assurance == null ? null : Number(r.taux_assurance),
        part_assurance: r.part_assurance == null ? null : toInt(r.part_assurance),
        part_patient: r.part_patient == null ? null : toInt(r.part_patient),
        pec_id: r.id,
      }));
    }
  }

  const metaLiaison = await resolveTable(client, T.consultActes);
  const metaActes = await resolveTable(client, T.actes);

  if (metaLiaison && metaActes) {
    const colConsult = pickColumn(metaLiaison, ['consultation_id']);
    const colActe = pickColumn(metaLiaison, ['acte_id', 'id_acte', 'nomenclature_id']);
    const colQte = pickColumn(metaLiaison, ['quantite', 'qte', 'nombre']);
    const colTarifLiaison = pickColumn(metaLiaison, C.tarif);
    const colTarifActe = pickColumn(metaActes, C.tarif);
    const colLibActe = pickColumn(metaActes, C.libelle);
    const colCodeActe = pickColumn(metaActes, C.codeActe);

    if (colConsult && colActe && colTarifActe) {
      const tarifExpr = colTarifLiaison
        ? `COALESCE(l."${colTarifLiaison}", a."${colTarifActe}")`
        : `a."${colTarifActe}"`;
      const { rows } = await client.query(
        `SELECT ${colCodeActe ? `a."${colCodeActe}"` : 'NULL'} AS code,
                ${colLibActe ? `a."${colLibActe}"` : `'Acte medical'`} AS libelle,
                ${tarifExpr} AS tarif,
                ${colQte ? `COALESCE(l."${colQte}", 1)` : '1'} AS quantite
           FROM "${metaLiaison.name}" l
           JOIN "${metaActes.name}" a ON a.id = l."${colActe}"
          WHERE l."${colConsult}" = $1`,
        [consultationId]
      );
      if (rows.length) {
        return rows.map((r) => ({
          code: r.code,
          libelle: r.libelle,
          tarif: toInt(r.tarif),
          quantite: toInt(r.quantite) || 1,
          taux: null,
        }));
      }
    }
  }

  // Fallback : colonne JSON sur la consultation
  const brut = consultation.actes || consultation.actes_json;
  if (brut) {
    const arr = typeof brut === 'string' ? JSON.parse(brut) : brut;
    if (Array.isArray(arr) && arr.length) {
      return arr.map((a) => ({
        code: a.code || a.code_acte || null,
        libelle: a.libelle || a.designation || 'Acte medical',
        tarif: toInt(a.tarif ?? a.prix ?? a.montant),
        quantite: toInt(a.quantite ?? a.qte ?? 1) || 1,
        taux: a.taux === undefined ? null : Number(a.taux),
      }));
    }
  }

  return [];
}

/* ------------------------------------------------------------------ */
/* 3. Prise en charge                                                  */
/* ------------------------------------------------------------------ */

async function chargerPriseEnCharge(client, consultationId, patientId) {
  const meta = await resolveTable(client, T.priseEnCharge);
  if (!meta) return { taux: 0, plafond: null, source: 'aucune' };

  const colTaux = pickColumn(meta, C.tauxPec);
  if (!colTaux) return { taux: 0, plafond: null, source: 'aucune' };
  const colPlafond = pickColumn(meta, C.plafond);
  const colConsult = pickColumn(meta, ['consultation_id']);
  const colPatient = pickColumn(meta, ['patient_id']);
  const sel = `"${colTaux}" AS taux${colPlafond ? `, "${colPlafond}" AS plafond` : ''}`;

  if (colConsult) {
    const { rows } = await client.query(
      `SELECT ${sel} FROM "${meta.name}" WHERE "${colConsult}" = $1 LIMIT 1`,
      [consultationId]
    );
    if (rows[0]) {
      return {
        taux: Number(rows[0].taux) || 0,
        plafond: rows[0].plafond == null ? null : toInt(rows[0].plafond),
        source: 'consultation',
      };
    }
  }

  if (colPatient && patientId) {
    const orderCol = pickColumn(meta, C.createdAt) || 'id';
    const { rows } = await client.query(
      `SELECT ${sel} FROM "${meta.name}"
        WHERE "${colPatient}" = $1
        ORDER BY "${orderCol}" DESC LIMIT 1`,
      [patientId]
    );
    if (rows[0]) {
      return {
        taux: Number(rows[0].taux) || 0,
        plafond: rows[0].plafond == null ? null : toInt(rows[0].plafond),
        source: 'patient',
      };
    }
  }

  return { taux: 0, plafond: null, source: 'aucune' };
}

/* ------------------------------------------------------------------ */
/* 4. Numerotation FAC-YY-00001                                        */
/* ------------------------------------------------------------------ */

async function genererNumero(client, metaFactures, cliniqueId) {
  const colNum = pickColumn(metaFactures, C.numero);
  const yy = String(new Date().getFullYear()).slice(-2);
  const prefixe = `FAC-${yy}-`;
  if (!colNum) return null;

  // Verrou transactionnel : deux consultations cloturees en parallele ne
  // peuvent pas tirer le meme numero. Libere au COMMIT.
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
    `facture:${cliniqueId || 'global'}:${yy}`,
  ]);

  const colClinique = pickColumn(metaFactures, ['clinique_id']);
  const where = colClinique && cliniqueId
    ? `WHERE "${colNum}" LIKE $1 AND "${colClinique}" = $2`
    : `WHERE "${colNum}" LIKE $1`;
  const params = colClinique && cliniqueId ? [`${prefixe}%`, cliniqueId] : [`${prefixe}%`];

  const { rows } = await client.query(
    `SELECT COALESCE(MAX(NULLIF(regexp_replace(SPLIT_PART("${colNum}", '-', 3), '\\D', '', 'g'), '')::int), 0) AS n
       FROM "${metaFactures.name}" ${where}`,
    params
  );
  const suivant = (rows[0]?.n || 0) + 1;
  return `${prefixe}${String(suivant).padStart(5, '0')}`;
}

/* ------------------------------------------------------------------ */
/* 5. Generation                                                       */
/* ------------------------------------------------------------------ */

/**
 * @param {object}  client         client pg DANS une transaction ouverte
 * @param {object}  opts
 * @param {string}  opts.consultationId
 * @param {string} [opts.cliniqueId]
 * @param {string} [opts.utilisateurId]
 * @param {Array}  [opts.actes]     surcharge manuelle des lignes
 * @param {number} [opts.taux]      surcharge du taux de prise en charge (0-100)
 * @param {boolean}[opts.force]     regenere meme si une facture existe
 */
async function genererFactureConsultation(client, opts) {
  const { consultationId, cliniqueId, utilisateurId, actes: actesFournis, taux: tauxForce, force } = opts;
  if (!consultationId) throw new FactureError('consultationId requis', 'BAD_INPUT', 400);

  const metaFactures = await resolveTable(client, T.factures);
  if (!metaFactures) {
    throw new FactureError(
      "Aucune table de factures trouvee (candidats : " + T.factures.join(', ') + ')',
      'SCHEMA_MISMATCH',
      500
    );
  }

  // --- idempotence
  if (!force) {
    const existante = await trouverFactureExistante(client, metaFactures, consultationId);
    if (existante) return { facture: existante, lignes: [], deja_existante: true };
  }

  // --- consultation
  const metaConsult = await resolveTable(client, T.consultations);
  const { rows: cRows } = await client.query(
    `SELECT * FROM "${metaConsult.name}" WHERE id = $1 LIMIT 1`,
    [consultationId]
  );
  const consultation = cRows[0];
  if (!consultation) throw new FactureError('Consultation introuvable', 'NOT_FOUND', 404);

  const patientId = consultation.patient_id || null;
  const cliniqueFinale = cliniqueId || consultation.clinique_id || null;

  // factures.patient_id est NOT NULL sans defaut : on echoue proprement.
  if (!patientId) {
    throw new FactureError(
      'Consultation sans patient_id : facture impossible (factures.patient_id NOT NULL)',
      'PATIENT_MANQUANT',
      422
    );
  }

  // --- lignes
  const lignes = await chargerActes(client, consultationId, consultation, actesFournis);
  if (!lignes.length) {
    throw new FactureError(
      'Aucun acte chiffre sur cette consultation : facture impossible',
      'AUCUN_ACTE',
      422
    );
  }

  // --- ventilation
  const pec = tauxForce === undefined
    ? await chargerPriseEnCharge(client, consultationId, patientId)
    : { taux: Number(tauxForce) || 0, plafond: null, source: 'surcharge' };

  const tauxGlobal = Math.max(0, Math.min(100, pec.taux));
  let totalBrut = 0;
  let totalAssurance = 0;
  let totalPatientLignes = 0;

  const lignesCalc = lignes.map((l) => {
    const montant = toInt(l.tarif) * (toInt(l.quantite) || 1);
    const tauxLigne = l.taux == null ? tauxGlobal : Math.max(0, Math.min(100, Number(l.taux)));
    // Si prise_en_charge_actes a deja ventile la ligne, on reprend ses
    // montants tels quels : la facture ne doit jamais contredire la prise
    // en charge signee avec l'assureur.
    const assurance = l.part_assurance != null
      ? l.part_assurance
      : Math.round((montant * tauxLigne) / 100);
    const patient = l.part_patient != null ? l.part_patient : montant - assurance;
    totalBrut += montant;
    totalAssurance += assurance;
    totalPatientLignes += patient;
    return { ...l, montant, taux: tauxLigne, part_assurance: assurance, part_patient: patient };
  });

  // plafond eventuel de l'assureur
  let plafondApplique = false;
  if (pec.plafond != null && totalAssurance > pec.plafond) {
    totalAssurance = pec.plafond;
    plafondApplique = true;
  }
  // Hors plafond, on somme les parts patient reelles : cela preserve les
  // arrondis ligne a ligne deja valides dans prise_en_charge_actes.
  const totalPatient = plafondApplique
    ? totalBrut - totalAssurance
    : totalPatientLignes;

  // --- numero
  const numero = await genererNumero(client, metaFactures, cliniqueFinale);
  const maintenant = new Date();

  // --- insert facture (colonnes filtrees selon le schema reel)
  const insertFacture = buildInsert(metaFactures, {
    numero:         { candidates: C.numero,        value: numero },
    consultation_id:{ candidates: ['consultation_id'], value: consultationId },
    patient_id:     { candidates: ['patient_id'],  value: patientId },
    clinique_id:    { candidates: ['clinique_id'], value: cliniqueFinale },
    medecin_id:     { candidates: ['medecin_id'],  value: consultation.medecin_id },
    medecin_indep:  { candidates: ['medecin_independant_id'], value: consultation.medecin_independant_id },
    medecin_nom:    { candidates: ['medecin_nom'], value: consultation.medecin_nom },
    montant_total:  { candidates: C.totalBrut,     value: totalBrut },
    part_patient:   { candidates: C.partPatient,   value: totalPatient },
    part_assurance: { candidates: C.partAssurance, value: totalAssurance },
    taux:           { candidates: C.tauxPec,       value: tauxGlobal },
    // Convention de la DB : 'en_attente' par defaut, 'payee' si rien a regler.
    statut:         { candidates: C.statut,        value: totalPatient === 0 ? 'payee' : 'en_attente' },
    date_facture:   { candidates: C.dateFacture,   value: maintenant },
    created_at:     { candidates: C.createdAt,     value: maintenant },
    cree_par:       { candidates: ['cree_par', 'utilisateur_id', 'created_by'], value: utilisateurId },
  });

  const { rows: fRows } = await client.query(insertFacture);
  const facture = fRows[0];

  // --- insert lignes (si la table existe)
  const metaLignes = await resolveTable(client, T.lignes);
  const lignesEnregistrees = [];
  if (metaLignes) {
    for (const l of lignesCalc) {
      const ins = buildInsert(metaLignes, {
        facture_id:     { candidates: ['facture_id'], value: facture.id },
        code:           { candidates: C.codeActe,     value: l.code },
        libelle:        { candidates: C.libelle,      value: l.libelle },
        tarif:          { candidates: C.tarif,        value: l.tarif },
        quantite:       { candidates: ['quantite', 'qte', 'nombre'], value: l.quantite },
        montant:        { candidates: ['montant', 'montant_ligne', 'total_ligne'], value: l.montant },
        taux:           { candidates: C.tauxPec,      value: l.taux },
        part_patient:   { candidates: C.partPatient,  value: l.part_patient },
        part_assurance: { candidates: C.partAssurance,value: l.part_assurance },
        created_at:     { candidates: C.createdAt,    value: maintenant },
      });
      const { rows } = await client.query(ins);
      lignesEnregistrees.push(rows[0]);
    }
  }

  // Les actes consommes passent de 'a_facturer' a 'facture' : dans la meme
  // transaction que la facture, donc jamais de double facturation ni de
  // ligne perdue si l'insert echoue.
  const pecIds = lignesCalc.map((l) => l.pec_id).filter(Boolean);
  if (pecIds.length) {
    await client.query(
      `UPDATE "prise_en_charge_actes"
          SET statut = 'facture'
        WHERE id = ANY($1::uuid[])`,
      [pecIds]
    );
  }

  return {
    facture,
    lignes: lignesEnregistrees.length ? lignesEnregistrees : lignesCalc,
    totaux: {
      montant_total: totalBrut,
      part_patient: totalPatient,
      part_assurance: totalAssurance,
      taux: tauxGlobal,
      source_prise_en_charge: pec.source,
    },
    deja_existante: false,
  };
}

module.exports = { genererFactureConsultation, FactureError };
