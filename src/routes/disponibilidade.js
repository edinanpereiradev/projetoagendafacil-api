// US04 — horários de atendimento por dia da semana
const express = require('express');
const db = require('../db');
const { autenticar, exigirTipo } = require('../auth');
const { ErroHttp, rota } = require('../erros');
const { inteiro, horaValida } = require('../validacao');
const { paraMin } = require('../slots');

const router = express.Router();
router.use(autenticar);

router.get('/:idPrestador', rota(async (req, res) => {
  const id = inteiro(req.params.idPrestador);
  if (!id) throw new ErroHttp(400, 'Prestador inválido.');
  const { rows } = await db.query(
    `SELECT id, dia_semana AS "diaSemana", hora_inicio AS "horaInicio", hora_fim AS "horaFim"
       FROM disponibilidades WHERE id_prestador = $1 ORDER BY dia_semana, hora_inicio`,
    [id]
  );
  res.json(rows);
}));

router.post('/', exigirTipo('prestador'), rota(async (req, res) => {
  const { diaSemana, horaInicio, horaFim } = req.body || {};
  const dia = Number(diaSemana);
  if (!Number.isInteger(dia) || dia < 0 || dia > 6) throw new ErroHttp(400, 'Dia da semana inválido.');
  if (!horaValida(horaInicio) || !horaValida(horaFim)) throw new ErroHttp(400, 'Informe horários no formato HH:MM.');
  if (paraMin(horaInicio) >= paraMin(horaFim)) throw new ErroHttp(400, 'O início deve ser antes do fim.');

  const { rows: existentes } = await db.query(
    'SELECT hora_inicio, hora_fim FROM disponibilidades WHERE id_prestador = $1 AND dia_semana = $2',
    [req.usuario.id, dia]
  );
  const conflita = existentes.some((e) => paraMin(horaInicio) < paraMin(e.hora_fim) && paraMin(horaFim) > paraMin(e.hora_inicio));
  if (conflita) throw new ErroHttp(409, 'Este horário se sobrepõe a outro já cadastrado neste dia.');

  const { rows } = await db.query(
    `INSERT INTO disponibilidades (id_prestador, dia_semana, hora_inicio, hora_fim) VALUES ($1, $2, $3, $4)
     RETURNING id, dia_semana AS "diaSemana", hora_inicio AS "horaInicio", hora_fim AS "horaFim"`,
    [req.usuario.id, dia, horaInicio, horaFim]
  );
  res.status(201).json(rows[0]);
}));

router.delete('/:id', exigirTipo('prestador'), rota(async (req, res) => {
  const id = inteiro(req.params.id);
  if (!id) throw new ErroHttp(400, 'Horário inválido.');
  const { rowCount } = await db.query('DELETE FROM disponibilidades WHERE id = $1 AND id_prestador = $2', [id, req.usuario.id]);
  if (!rowCount) throw new ErroHttp(404, 'Horário não encontrado.');
  res.json({ mensagem: 'Horário removido.' });
}));

module.exports = router;
