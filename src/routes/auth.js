// US01 (cadastro de cliente), US02 (cadastro de prestador) e US03 (login)
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../config');
const { ErroHttp, rota } = require('../erros');

const router = express.Router();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const usuarioPublico = (u) => ({
  id: u.id,
  nome: u.nome,
  email: u.email,
  tipo: u.tipo,
  telefone: u.telefone,
  nomeNegocio: u.nome_negocio,
  especialidade: u.especialidade,
});

const gerarToken = (u) => jwt.sign({ id: u.id, tipo: u.tipo, nome: u.nome }, config.jwtSecret, { expiresIn: '8h' });

router.post('/registrar', rota(async (req, res) => {
  const { nome, email, senha, tipo, telefone, nomeNegocio, especialidade } = req.body || {};
  const nomeLimpo = String(nome || '').trim();
  const emailLimpo = String(email || '').trim().toLowerCase();
  const tel = String(telefone || '').trim();
  const negocio = String(nomeNegocio || '').trim();

  if (!nomeLimpo) throw new ErroHttp(400, 'Informe o nome.');
  if (!EMAIL.test(emailLimpo)) throw new ErroHttp(400, 'Informe um e-mail válido.');
  if (String(senha || '').length < 6) throw new ErroHttp(400, 'A senha deve ter pelo menos 6 caracteres.');
  if (!['cliente', 'prestador'].includes(tipo)) throw new ErroHttp(400, 'Tipo de conta inválido.');
  if (tipo === 'cliente' && !tel) throw new ErroHttp(400, 'Informe o telefone.');
  if (tipo === 'prestador' && !negocio) throw new ErroHttp(400, 'Informe o nome do negócio.');

  const hash = await bcrypt.hash(String(senha), 10);
  try {
    const { rows } = await db.query(
      `INSERT INTO usuarios (nome, email, senha_hash, tipo, telefone, nome_negocio, especialidade)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [nomeLimpo, emailLimpo, hash, tipo, tel || null, negocio || null, String(especialidade || '').trim() || null]
    );
    res.status(201).json({ token: gerarToken(rows[0]), usuario: usuarioPublico(rows[0]) });
  } catch (erro) {
    if (erro.code === '23505') throw new ErroHttp(409, 'Este e-mail já está cadastrado.');
    throw erro;
  }
}));

router.post('/login', rota(async (req, res) => {
  const { email, senha } = req.body || {};
  const { rows } = await db.query('SELECT * FROM usuarios WHERE email = $1', [String(email || '').trim().toLowerCase()]);
  const usuario = rows[0];
  const confere = usuario && (await bcrypt.compare(String(senha || ''), usuario.senha_hash));
  if (!confere) throw new ErroHttp(401, 'E-mail ou senha inválidos.');
  res.json({ token: gerarToken(usuario), usuario: usuarioPublico(usuario) });
}));

module.exports = router;
