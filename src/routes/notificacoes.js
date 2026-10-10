// US10 e US11 — leitura das notificações do usuário logado
const express = require('express');
const db = require('../db');
const { autenticar } = require('../auth');
const { rota } = require('../erros');

const router = express.Router();
router.use(autenticar);

router.get('/', rota(async (req, res) => {
  // "data" em UTC no formato AAAA-MM-DD HH:MM:SS, que é o que a interface espera.
  const { rows } = await db.query(
    `SELECT mensagem, to_char(criado_em AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') AS data
       FROM notificacoes WHERE id_usuario = $1
      ORDER BY criado_em DESC, id DESC LIMIT 50`,
    [req.usuario.id]
  );
  res.json(rows);
}));

module.exports = router;
