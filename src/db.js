const fs = require('fs');
const path = require('path');
const { Pool, types } = require('pg');
const config = require('./config');

// NUMERIC (1700) e BIGINT (20) chegam como texto no driver; aqui viram número.
types.setTypeParser(1700, parseFloat);
types.setTypeParser(20, (v) => parseInt(v, 10));

const local = /localhost|127\.0\.0\.1/.test(config.databaseUrl);
const usarSsl = process.env.PGSSL ? process.env.PGSSL === 'true' : !local;

const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: usarSsl ? { rejectUnauthorized: false } : false,
});

const query = (texto, params) => pool.query(texto, params);

// Executa fn(cx) dentro de uma transação; desfaz tudo se lançar erro.
async function transacao(fn) {
  const cx = await pool.connect();
  try {
    await cx.query('BEGIN');
    const resultado = await fn(cx);
    await cx.query('COMMIT');
    return resultado;
  } catch (erro) {
    await cx.query('ROLLBACK');
    throw erro;
  } finally {
    cx.release();
  }
}

async function iniciarBanco() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
}

module.exports = { pool, query, transacao, iniciarBanco };
