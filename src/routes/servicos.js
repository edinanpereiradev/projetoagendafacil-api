// US05 — cadastro de serviços do prestador
const express = require('express');
const db = require('../db');
const { autenticar, exigirTipo } = require('../auth');
const { ErroHttp, rota } = require('../erros');
const { inteiro } = require('../validacao');

const router = express.Router();
router.use(autenticar, exigirTipo('prestador'));

router.post('/', rota(async (req, res) => {
  const { nome, preco, duracaoMin } = req.body || {};
  const nomeLimpo = String(nome || '').trim();
  const precoNum = Number(preco);
  const duracao = Number(duracaoMin);

  if (!nomeLimpo || nomeLimpo.length > 100) throw new ErroHttp(400, 'Informe o nome do serviço (até 100 caracteres).', 'nome');
  if (!Number.isFinite(precoNum) || precoNum < 0) throw new ErroHttp(400, 'Informe um preço válido.', 'preco');
  if (!Number.isInteger(duracao) || duracao < 5 || duracao > 480) {
    throw new ErroHttp(400, 'A duração deve ser de 5 a 480 minutos.', 'duracaoMin');
  }

  const { rows } = await db.query(
    `INSERT INTO servicos (id_prestador, nome, preco, duracao_min) VALUES ($1, $2, $3, $4)
     RETURNING id, nome, preco, duracao_min AS "duracaoMin"`,
    [req.usuario.id, nomeLimpo, precoNum.toFixed(2), duracao]
  );
  res.status(201).json(rows[0]);
}));

router.delete('/:id', rota(async (req, res) => {
  const id = inteiro(req.params.id);
  if (!id) throw new ErroHttp(400, 'Serviço inválido.');
  const { rowCount } = await db.query('DELETE FROM servicos WHERE id = $1 AND id_prestador = $2', [id, req.usuario.id]);
  if (!rowCount) throw new ErroHttp(404, 'Serviço não encontrado.');
  res.json({ mensagem: 'Serviço removido.' });
}));

module.exports = router;
