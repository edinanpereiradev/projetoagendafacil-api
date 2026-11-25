# AgendaFácil — API

API REST do AgendaFácil (Projeto Integrador II). Atende a interface do repositório `projetoagendafacil-ui`.

## Tecnologias

| Tecnologia | Uso | Por quê |
|---|---|---|
| Node.js 20+ e Express | Servidor HTTP e rotas REST | Mesma linguagem do front; poucas dependências |
| PostgreSQL (`pg`) | Persistência | Roda no Render; o sistema de arquivos gratuito do Render é efêmero, então SQLite perderia os dados |
| JWT (`jsonwebtoken`) | Autenticação por token Bearer | API sem sessão no servidor |
| bcryptjs | Hash das senhas | Senhas nunca ficam em texto puro |
| cors / dotenv | Origens permitidas e variáveis de ambiente | Front na Vercel e API no Render têm domínios diferentes |
| `node:test` | Testes automatizados | Já vem no Node, sem biblioteca extra |
| Render + Vercel | Hospedagem da API e do front | Deploy a partir do GitHub |

## Rodando localmente

```bash
npm install
cp .env.example .env        # ajuste DATABASE_URL e JWT_SECRET
npm run seed                # opcional: cria usuários e serviços de demonstração
npm start                   # http://localhost:3000/api/saude
npm test                    # testes do cálculo de horários e validações
```

Postgres local rápido: `docker run -e POSTGRES_PASSWORD=senha -p 5432:5432 -e POSTGRES_DB=agendafacil postgres`.
As tabelas são criadas automaticamente na primeira execução (`src/schema.sql`).

Demonstração (após `npm run seed`): prestador `lays@studiolayskarla.com`, cliente `juliana@email.com`, senha `123456`.
Não rode o seed em um ambiente publicado de verdade: essas credenciais são públicas.

## Endpoints

Erros sempre voltam como `{ "erro": "mensagem" }` e, quando o problema está em um campo do formulário, com `{ "erro": "mensagem", "campo": "email" }`. Exceto login e cadastro, todas as rotas exigem `Authorization: Bearer <token>`.

| Cartão | Método e rota | Perfil |
|---|---|---|
| US01, US02 | `POST /api/auth/registrar` | público |
| US03 | `POST /api/auth/login` | público |
| US04 | `GET /api/disponibilidade/:idPrestador`, `POST /api/disponibilidade`, `DELETE /api/disponibilidade/:id` | leitura: todos; escrita: prestador |
| US05 | `POST /api/servicos`, `DELETE /api/servicos/:id`; `GET /api/prestadores`, `GET /api/prestadores/:id/servicos` | prestador (escrita) |
| US06 | `GET /api/agendamentos/horarios-disponiveis?idPrestador&idServico&data` | todos |
| US07 | `POST /api/agendamentos` | cliente |
| US08 | `PUT /api/agendamentos/:id/cancelar` | cliente e prestador |
| US09 | `PUT /api/agendamentos/:id/remarcar` `{ data, hora }` | cliente |
| US10, US11 | `GET /api/notificacoes` (geradas ao agendar, cancelar e remarcar) | todos |
| US12 | `GET /api/dashboard/prestador` | prestador |
| US13 | usa `GET /api/agendamentos/meus` (o relatório é montado na interface) | prestador |
| extra | `PUT /api/agendamentos/:id/status` `{ status: "concluido" \| "faltou" }` | prestador |

Regras principais: o horário só é oferecido se estiver dentro da disponibilidade do prestador, não conflitar com agendamento confirmado e não já ter passado; a criação e a remarcação travam o prestador durante a verificação para impedir dois clientes no mesmo horário.

## Integração com o front-end e segurança

**CORS (API-10).** O navegador bloqueia respostas de uma origem diferente da página (protocolo + domínio + porta). A API declara quais origens confia em `CORS_ORIGIN` (várias separadas por vírgula, por exemplo `http://localhost:5500,https://agendafacil.vercel.app`). Vazio libera qualquer origem, só para desenvolvimento. Métodos liberados: GET, POST, PUT, DELETE e OPTIONS; cabeçalhos: `Content-Type` e `Authorization`; o resultado do preflight pode ser guardado por 10 minutos. Veja `src/server.js`.

**Senhas com BCrypt (API-11).** O cadastro grava só o hash (`bcryptjs`, custo 10) em `usuarios.senha_hash`; o login compara a senha enviada com o hash. Como o BCrypt embute um *salt* aleatório, duas pessoas com a mesma senha têm hashes diferentes. Nenhuma resposta da API devolve senha nem hash (`src/usuario.js`, coberto por teste). Para conferir no banco:

```bash
npm run verificar-hash
```

ou, no pgAdmin (Query Tool no banco `agendafacil`):

```sql
SELECT id, email, LEFT(senha_hash, 7) AS prefixo, LENGTH(senha_hash) AS tamanho FROM usuarios;
```

O prefixo deve ser `$2a$10` (ou `$2b$10`) e o tamanho 60.

**Erro padronizado (API-13).** Toda falha sai como `{ "erro": "..." }`, com `campo` quando há um campo inválido (`nome`, `email`, `senha`, `telefone`, `nomeNegocio`, `preco`, `duracaoMin`, `diaSemana`, `horaInicio`, `horaFim`, `data`, `hora`). A interface usa esse campo para destacar o input certo.

## Testando com o Postman (API-12)

1. Suba a API (`npm start`).
2. No Postman: **Import** e escolha `postman/AgendaFacil.postman_collection.json`.
3. Confira as variáveis da coleção: `baseUrl` (`http://localhost:3000/api`) e `origemFront` (a origem da UI, por exemplo `http://localhost:5500`). Se a API estiver com `CORS_ORIGIN` preenchido, mude `corsRestrito` para `true`.
4. Abra a coleção, clique em **Run** e execute tudo, na ordem. Cada execução cria usuários novos e remove o que criou.

A coleção tem 45 requisições, cada uma com testes de status code. Ela verifica, entre outros pontos: respostas 2xx, 400, 401, 403, 404 e 409; o formato `{ erro, campo }`; **que nenhuma resposta contém senha ou hash**; o preflight de CORS; o conflito de horário; a remarcação, o cancelamento e as notificações geradas.

## Scripts

| Comando | O que faz |
|---|---|
| `npm start` | sobe a API |
| `npm run seed` | cria dados de demonstração |
| `npm test` | testes automatizados (horários livres, validações, usuário público, erro padronizado) |
| `npm run verificar-hash` | confere que as senhas no banco estão em formato BCrypt |

## Deploy

**Render (API):** crie um *Web Service* a partir deste repositório (build `npm install`, start `npm start`) e um *PostgreSQL*. Variáveis: `DATABASE_URL` (a URL do banco), `JWT_SECRET` (texto longo e aleatório), `NODE_ENV=production`, `CORS_ORIGIN` (URL do front na Vercel). O arquivo `render.yaml` descreve isso; confira-o na documentação do Render antes de usar.
Plano gratuito: o serviço dorme após 15 minutos sem uso e o Postgres gratuito expira em 30 dias.

**Vercel (front):** importe o repositório `projetoagendafacil-ui` como site estático e ajuste `API_PRODUCAO` em `js/api.js` para a URL do Render.

## Fluxo de versionamento sugerido

Uma branch por cartão do Trello (`feat/us06-horarios-disponiveis`), commits pequenos, Pull Request revisado por outro integrante e só então o cartão vai de "Em Revisão" para "Concluído".
