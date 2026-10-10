// Listagem de prestadores e dos serviços de cada um (apoia US05 e US06)
const express = require('express');
const db = require('../db');
const { autenticar } = require('../auth');
const { ErroHttp, rota } = require('../erros');
const { inteiro } = require('../validacao');

const router = express.Router();
router.use(autenticar);

router.get('/', rota(async (req, res) => {
  const { rows } = await db.query(
    `SELECT id, nome, nome_negocio AS "nomeNegocio", especialidade, descricao
       FROM usuarios WHERE tipo = 'prestador'
      ORDER BY COALESCE(nome_negocio, nome)`
  );
  res.json(rows);
}));

router.get('/:id/servicos', rota(async (req, res) => {
  const id = inteiro(req.params.id);
  if (!id) throw new ErroHttp(400, 'Prestador inválido.');
  const { rows } = await db.query(
    `SELECT id, nome, preco, duracao_min AS "duracaoMin"
       FROM servicos WHERE id_prestador = $1 ORDER BY nome`,
    [id]
  );
  res.json(rows);
}));

module.exports = router;
