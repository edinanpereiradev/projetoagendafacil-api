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

Erros sempre voltam como `{ "erro": "mensagem" }`. Exceto login e cadastro, todas as rotas exigem `Authorization: Bearer <token>`.

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

## Deploy

**Render (API):** crie um *Web Service* a partir deste repositório (build `npm install`, start `npm start`) e um *PostgreSQL*. Variáveis: `DATABASE_URL` (a URL do banco), `JWT_SECRET` (texto longo e aleatório), `NODE_ENV=production`, `CORS_ORIGIN` (URL do front na Vercel). O arquivo `render.yaml` descreve isso; confira-o na documentação do Render antes de usar.
Plano gratuito: o serviço dorme após 15 minutos sem uso e o Postgres gratuito expira em 30 dias.

**Vercel (front):** importe o repositório `projetoagendafacil-ui` como site estático e ajuste `API_PRODUCAO` em `js/api.js` para a URL do Render.

## Fluxo de versionamento sugerido

Uma branch por cartão do Trello (`feat/us06-horarios-disponiveis`), commits pequenos, Pull Request revisado por outro integrante e só então o cartão vai de "Em Revisão" para "Concluído".
