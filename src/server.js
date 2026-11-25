const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const config = require('./config');
const { iniciarBanco } = require('./db');

const app = express();
// CORS: o navegador só libera a resposta para as origens listadas em CORS_ORIGIN
// (vazio = qualquer origem, apenas para desenvolvimento).
app.use(cors({
  origin: config.origensPermitidas.length ? config.origensPermitidas : true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600 // o navegador pode guardar o resultado do preflight por 10 minutos
}));
app.use(express.json());

// Usado pelo health check do Render
app.get('/api/saude', (req, res) => res.json({ status: 'ok' }));

// Cada arquivo de src/routes é montado em /api/<nome-do-arquivo>
const pastaRotas = path.join(__dirname, 'routes');
fs.readdirSync(pastaRotas)
  .filter((arquivo) => arquivo.endsWith('.js'))
  .forEach((arquivo) => {
    app.use(`/api/${path.basename(arquivo, '.js')}`, require(path.join(pastaRotas, arquivo)));
  });

app.use((req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));

// eslint-disable-next-line no-unused-vars
app.use((erro, req, res, next) => {
  if (erro.type === 'entity.parse.failed') return res.status(400).json({ erro: 'JSON inválido.' });
  if (erro.status) {
    // Formato padrão de erro: { erro: "mensagem" } e, quando houver, { campo: "nomeDoCampo" }
    return res.status(erro.status).json(erro.campo ? { erro: erro.message, campo: erro.campo } : { erro: erro.message });
  }
  console.error(erro);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

iniciarBanco()
  .then(() => app.listen(config.porta, () => console.log(`API do AgendaFácil na porta ${config.porta}`)))
  .catch((erro) => {
    console.error('Falha ao iniciar o banco de dados:', erro.message);
    process.exit(1);
  });
