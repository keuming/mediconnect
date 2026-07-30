'use strict';

/**
 * dbIntrospect.js — MediConnect Africa / CSN
 *
 * Resout les vrais noms de tables et de colonnes a l'execution, via
 * information_schema, au lieu de les supposer. Cache en scope module :
 * sur Vercel, l'instance lambda reste chaude, donc 1 seule requete
 * information_schema par table et par instance.
 *
 * Objectif : ne plus jamais ecrire un INSERT sur une colonne inexistante.
 */

const metaCache = new Map();

/** Vide le cache (utile apres une migration). */
function resetIntrospectionCache() {
  metaCache.clear();
}

/**
 * Metadonnees d'une table : existence, colonnes, nullabilite, defaut.
 * @returns {Promise<{exists:boolean, name:string, columns:Map<string,object>}>}
 */
async function getTableMeta(client, table) {
  if (metaCache.has(table)) return metaCache.get(table);

  const { rows } = await client.query(
    `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name   = $1
      ORDER BY ordinal_position`,
    [table]
  );

  const meta = {
    exists: rows.length > 0,
    name: table,
    columns: new Map(rows.map((r) => [r.column_name, r])),
  };
  metaCache.set(table, meta);
  return meta;
}

/**
 * Premiere table existante parmi une liste de candidats.
 * @returns {Promise<object|null>} meta de la table trouvee, sinon null
 */
async function resolveTable(client, candidates) {
  for (const t of candidates) {
    const meta = await getTableMeta(client, t);
    if (meta.exists) return meta;
  }
  return null;
}

/** Premiere colonne existante parmi une liste de candidats. */
function pickColumn(meta, candidates) {
  if (!meta) return null;
  for (const c of candidates) {
    if (meta.columns.has(c)) return c;
  }
  return null;
}

/** true si la table possede au moins une des colonnes candidates. */
function hasAnyColumn(meta, candidates) {
  return pickColumn(meta, candidates) !== null;
}

/**
 * Construit un INSERT en ne gardant que les colonnes reellement presentes.
 *
 * @param {object} meta   metadonnees issues de getTableMeta / resolveTable
 * @param {object} fields { cleLogique: { candidates: string[], value: any } }
 * @param {object} [opts] { returning: '*' }
 * @throws {Error} code = 'SCHEMA_MISMATCH' si une colonne NOT NULL sans
 *                 valeur par defaut n'est pas alimentee. Le message liste
 *                 les colonnes fautives : diagnostic immediat, plus de 500
 *                 opaque venant de Postgres.
 */
function buildInsert(meta, fields, opts = {}) {
  if (!meta || !meta.exists) {
    const err = new Error('Table introuvable pour buildInsert');
    err.code = 'SCHEMA_MISMATCH';
    throw err;
  }

  const cols = [];
  const params = [];
  const placeholders = [];
  const used = new Set();

  for (const [logical, spec] of Object.entries(fields)) {
    const col = pickColumn(meta, spec.candidates);
    if (!col) continue;                    // colonne absente du schema reel
    if (spec.value === undefined) continue; // rien a ecrire
    if (used.has(col)) continue;            // deja alimentee par une autre cle
    used.add(col);
    cols.push(`"${col}"`);
    params.push(spec.value);
    placeholders.push(`$${params.length}`);
    void logical;
  }

  // Garde-fou : colonnes obligatoires laissees vides
  const missing = [];
  for (const [name, c] of meta.columns) {
    if (c.is_nullable === 'NO' && !c.column_default && !used.has(name)) {
      missing.push(name);
    }
  }
  if (missing.length) {
    const err = new Error(
      `Colonnes NOT NULL sans valeur sur "${meta.name}" : ${missing.join(', ')}`
    );
    err.code = 'SCHEMA_MISMATCH';
    err.table = meta.name;
    err.missing = missing;
    throw err;
  }

  const returning = opts.returning === null ? '' : ` RETURNING ${opts.returning || '*'}`;
  return {
    text: `INSERT INTO "${meta.name}" (${cols.join(', ')}) VALUES (${placeholders.join(', ')})${returning}`,
    values: params,
  };
}

/** Transaction courte. Le callback recoit le client dedie. */
async function withTransaction(pool, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch (_) { /* noop */ }
    throw e;
  } finally {
    client.release();
  }
}

module.exports = {
  getTableMeta,
  resolveTable,
  pickColumn,
  hasAnyColumn,
  buildInsert,
  withTransaction,
  resetIntrospectionCache,
};
