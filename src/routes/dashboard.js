// US12 — indicadores do painel do prestador (inclui concluídos e faltas/no-show)
const express = require('express');
const db = require('../db');
const { autenticar, exigirTipo } = require('../auth');
const { rota } = require('../erros');
const { agoraLocal } = require('../tempo');

const router = express.Router();
router.use(autenticar, exigirTipo('prestador'));

router.get('/prestador', rota(async (req, res) => {
  const { rows } = await db.query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'confirmado' AND data = $2)::int AS "totalHoje",
       COUNT(*) FILTER (WHERE status = 'confirmado')::int              AS "totalConfirmados",
       COUNT(*) FILTER (WHERE status = 'cancelado')::int               AS "totalCancelados",
       COUNT(*) FILTER (WHERE status = 'concluido')::int               AS "totalConcluidos",
       COUNT(*) FILTER (WHERE status = 'faltou')::int                  AS "totalNoShow",
       COALESCE(SUM(preco) FILTER (WHERE status = 'confirmado'), 0)    AS "faturamentoPrevisto"
     FROM agendamentos WHERE id_prestador = $1`,
    [req.usuario.id, agoraLocal().data]
  );
  res.json(rows[0]);
}));

module.exports = router;
