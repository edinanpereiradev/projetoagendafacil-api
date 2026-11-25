// US06 (horários livres), US07 (agendar), US08 (cancelar), US09 (remarcar),
// US10/US11 (notificações geradas a cada ação) e atualização de status pelo prestador.
const express = require('express');
const db = require('../db');
const { autenticar, exigirTipo } = require('../auth');
const { ErroHttp, rota } = require('../erros');
const { inteiro, dataValida, horaValida, formatarData } = require('../validacao');
const { gerarHorarios, diaDaSemana } = require('../slots');
const { agoraLocal } = require('../tempo');

const router = express.Router();
router.use(autenticar);

// cx = db ou um client de transação (ambos têm .query)
async function horariosLivres(cx, { idPrestador, duracaoMin, data, ignorarId = null }) {
  const janelas = await cx.query(
    `SELECT hora_inicio AS "horaInicio", hora_fim AS "horaFim"
       FROM disponibilidades WHERE id_prestador = $1 AND dia_semana = $2`,
    [idPrestador, diaDaSemana(data)]
  );
  const ocupados = await cx.query(
    `SELECT hora, duracao_min AS "duracaoMin" FROM agendamentos
      WHERE id_prestador = $1 AND data = $2 AND status = 'confirmado'
        AND ($3::int IS NULL OR id <> $3::int)`,
    [idPrestador, data, ignorarId]
  );
  return gerarHorarios({
    data,
    duracaoMin,
    janelas: janelas.rows,
    ocupados: ocupados.rows,
    agora: agoraLocal(),
  });
}

const notificar = (cx, idUsuario, mensagem) =>
  cx.query('INSERT INTO notificacoes (id_usuario, mensagem) VALUES ($1, $2)', [idUsuario, mensagem]);

// Carrega um agendamento do usuário logado, travando a linha para a transação.
async function carregarAgendamento(cx, id, idUsuario, extraWhere = '') {
  const { rows } = await cx.query(
    `SELECT a.*, c.nome AS cliente_nome, COALESCE(p.nome_negocio, p.nome) AS prestador_nome
       FROM agendamentos a
       JOIN usuarios c ON c.id = a.id_cliente
       JOIN usuarios p ON p.id = a.id_prestador
      WHERE a.id = $1 AND (a.id_cliente = $2 OR a.id_prestador = $2) ${extraWhere}
        FOR UPDATE OF a`,
    [id, idUsuario]
  );
  if (!rows[0]) throw new ErroHttp(404, 'Agendamento não encontrado.');
  return rows[0];
}

// ---------- US06: horários disponíveis ----------
router.get('/horarios-disponiveis', rota(async (req, res) => {
  const idPrestador = inteiro(req.query.idPrestador);
  const idServico = inteiro(req.query.idServico);
  const { data } = req.query;
  if (!idPrestador || !idServico) throw new ErroHttp(400, 'Informe idPrestador e idServico.');
  if (!dataValida(data)) throw new ErroHttp(400, 'Data inválida. Use o formato AAAA-MM-DD.', 'data');

  const { rows } = await db.query(
    'SELECT duracao_min AS "duracaoMin" FROM servicos WHERE id = $1 AND id_prestador = $2',
    [idServico, idPrestador]
  );
  if (!rows[0]) throw new ErroHttp(404, 'Serviço não encontrado para este prestador.');

  res.json({ slots: await horariosLivres(db, { idPrestador, duracaoMin: rows[0].duracaoMin, data }) });
}));

// ---------- Listagem (cliente vê os seus; prestador vê a sua agenda) ----------
router.get('/meus', rota(async (req, res) => {
  const coluna = req.usuario.tipo === 'cliente' ? 'a.id_cliente' : 'a.id_prestador';
  const { rows } = await db.query(
    `SELECT a.id, a.id_prestador AS "idPrestador", a.id_servico AS "idServico",
            a.servico_nome AS servico, a.preco, a.duracao_min AS "duracaoMin",
            a.data, a.hora, a.status,
            COALESCE(p.nome_negocio, p.nome) AS "prestadorNome",
            c.nome AS "clienteNome", c.telefone AS "clienteTelefone"
       FROM agendamentos a
       JOIN usuarios p ON p.id = a.id_prestador
       JOIN usuarios c ON c.id = a.id_cliente
      WHERE ${coluna} = $1
      ORDER BY a.data DESC, a.hora DESC`,
    [req.usuario.id]
  );
  res.json(rows);
}));

// ---------- US07 (+ US10 e US11): agendar ----------
router.post('/', exigirTipo('cliente'), rota(async (req, res) => {
  const { idPrestador, idServico, data, hora } = req.body || {};
  const idP = inteiro(idPrestador);
  const idS = inteiro(idServico);
  if (!idP || !idS) throw new ErroHttp(400, 'Informe prestador e serviço.');
  if (!dataValida(data)) throw new ErroHttp(400, 'Data inválida. Use o formato AAAA-MM-DD.', 'data');
  if (!horaValida(hora)) throw new ErroHttp(400, 'Horário inválido. Use o formato HH:MM.', 'hora');

  const id = await db.transacao(async (cx) => {
    // Um agendamento por vez por prestador: evita dois clientes pegando o mesmo horário.
    await cx.query('SELECT pg_advisory_xact_lock($1)', [idP]);

    const { rows } = await cx.query(
      `SELECT s.nome, s.preco, s.duracao_min AS "duracaoMin", COALESCE(p.nome_negocio, p.nome) AS "prestadorNome"
         FROM servicos s JOIN usuarios p ON p.id = s.id_prestador
        WHERE s.id = $1 AND s.id_prestador = $2`,
      [idS, idP]
    );
    const servico = rows[0];
    if (!servico) throw new ErroHttp(404, 'Serviço não encontrado para este prestador.');

    const livres = await horariosLivres(cx, { idPrestador: idP, duracaoMin: servico.duracaoMin, data });
    if (!livres.includes(hora)) throw new ErroHttp(409, 'Este horário não está mais disponível. Escolha outro.', 'hora');

    const ins = await cx.query(
      `INSERT INTO agendamentos (id_cliente, id_prestador, id_servico, servico_nome, preco, duracao_min, data, hora)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [req.usuario.id, idP, idS, servico.nome, servico.preco, servico.duracaoMin, data, hora]
    );

    const quando = `${formatarData(data)} às ${hora}`;
    await notificar(cx, req.usuario.id, `Agendamento confirmado: ${servico.nome} com ${servico.prestadorNome} em ${quando}.`);
    await notificar(cx, idP, `Novo agendamento: ${servico.nome} com ${req.usuario.nome} em ${quando}.`);
    return ins.rows[0].id;
  });

  res.status(201).json({ id, mensagem: 'Agendamento confirmado.' });
}));

// ---------- US08: cancelar (cliente ou prestador) ----------
router.put('/:id/cancelar', rota(async (req, res) => {
  const id = inteiro(req.params.id);
  if (!id) throw new ErroHttp(400, 'Agendamento inválido.');

  await db.transacao(async (cx) => {
    const a = await carregarAgendamento(cx, id, req.usuario.id);
    if (a.status !== 'confirmado') throw new ErroHttp(409, 'Só é possível cancelar agendamentos confirmados.');

    await cx.query("UPDATE agendamentos SET status = 'cancelado' WHERE id = $1", [id]);

    const quando = `${formatarData(a.data)} às ${a.hora}`;
    if (req.usuario.id === a.id_cliente) {
      await notificar(cx, a.id_prestador, `${a.cliente_nome} cancelou ${a.servico_nome} em ${quando}.`);
    } else {
      await notificar(cx, a.id_cliente, `${a.prestador_nome} cancelou seu agendamento de ${a.servico_nome} em ${quando}.`);
    }
  });

  res.json({ mensagem: 'Agendamento cancelado.' });
}));

// ---------- US09: remarcar (mesmo prestador e serviço, nova data/hora) ----------
router.put('/:id/remarcar', exigirTipo('cliente'), rota(async (req, res) => {
  const id = inteiro(req.params.id);
  const { data, hora } = req.body || {};
  if (!id) throw new ErroHttp(400, 'Agendamento inválido.');
  if (!dataValida(data)) throw new ErroHttp(400, 'Data inválida. Use o formato AAAA-MM-DD.', 'data');
  if (!horaValida(hora)) throw new ErroHttp(400, 'Horário inválido. Use o formato HH:MM.', 'hora');

  await db.transacao(async (cx) => {
    const a = await carregarAgendamento(cx, id, req.usuario.id, 'AND a.id_cliente = $2');
    if (a.status !== 'confirmado') throw new ErroHttp(409, 'Só é possível remarcar agendamentos confirmados.');
    if (a.data === data && a.hora === hora) throw new ErroHttp(400, 'Escolha um horário diferente do atual.');

    await cx.query('SELECT pg_advisory_xact_lock($1)', [a.id_prestador]);
    // O próprio agendamento é ignorado na conta: o horário antigo fica livre durante a troca.
    const livres = await horariosLivres(cx, {
      idPrestador: a.id_prestador, duracaoMin: a.duracao_min, data, ignorarId: id,
    });
    if (!livres.includes(hora)) throw new ErroHttp(409, 'Este horário não está disponível. Escolha outro.', 'hora');

    await cx.query('UPDATE agendamentos SET data = $1, hora = $2 WHERE id = $3', [data, hora, id]);

    const antes = `${formatarData(a.data)} às ${a.hora}`;
    const depois = `${formatarData(data)} às ${hora}`;
    await notificar(cx, a.id_cliente, `Agendamento remarcado: ${a.servico_nome} com ${a.prestador_nome} de ${antes} para ${depois}.`);
    await notificar(cx, a.id_prestador, `${a.cliente_nome} remarcou ${a.servico_nome} de ${antes} para ${depois}.`);
  });

  res.json({ mensagem: 'Agendamento remarcado.' });
}));

// ---------- Prestador marca atendimento como concluído ou falta (no-show) ----------
router.put('/:id/status', exigirTipo('prestador'), rota(async (req, res) => {
  const id = inteiro(req.params.id);
  const { status } = req.body || {};
  if (!id) throw new ErroHttp(400, 'Agendamento inválido.');
  if (!['concluido', 'faltou'].includes(status)) throw new ErroHttp(400, "Status deve ser 'concluido' ou 'faltou'.");

  await db.transacao(async (cx) => {
    const a = await carregarAgendamento(cx, id, req.usuario.id, 'AND a.id_prestador = $2');
    if (a.status !== 'confirmado') throw new ErroHttp(409, 'Só é possível alterar agendamentos confirmados.');
    await cx.query('UPDATE agendamentos SET status = $1 WHERE id = $2', [status, id]);
  });

  res.json({ mensagem: 'Status atualizado.' });
}));

module.exports = router;
