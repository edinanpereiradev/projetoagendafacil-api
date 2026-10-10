CREATE TABLE IF NOT EXISTS usuarios (
  id            SERIAL PRIMARY KEY,
  nome          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  senha_hash    TEXT NOT NULL,
  tipo          TEXT NOT NULL CHECK (tipo IN ('cliente', 'prestador')),
  telefone      TEXT,
  nome_negocio  TEXT,
  especialidade TEXT,
  descricao     TEXT,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS servicos (
  id           SERIAL PRIMARY KEY,
  id_prestador INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome         TEXT NOT NULL,
  preco        NUMERIC(10,2) NOT NULL CHECK (preco >= 0),
  duracao_min  INT NOT NULL CHECK (duracao_min > 0),
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS disponibilidades (
  id           SERIAL PRIMARY KEY,
  id_prestador INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  dia_semana   INT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio  TEXT NOT NULL,
  hora_fim     TEXT NOT NULL
);

-- servico_nome, preco e duracao_min são cópias do serviço no momento do agendamento:
-- o histórico não muda se o prestador editar ou remover o serviço depois.
CREATE TABLE IF NOT EXISTS agendamentos (
  id           SERIAL PRIMARY KEY,
  id_cliente   INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  id_prestador INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  id_servico   INT REFERENCES servicos(id) ON DELETE SET NULL,
  servico_nome TEXT NOT NULL,
  preco        NUMERIC(10,2) NOT NULL,
  duracao_min  INT NOT NULL,
  data         TEXT NOT NULL,   -- AAAA-MM-DD
  hora         TEXT NOT NULL,   -- HH:MM
  status       TEXT NOT NULL DEFAULT 'confirmado'
               CHECK (status IN ('confirmado', 'cancelado', 'concluido', 'faltou')),
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agendamentos_prestador_data ON agendamentos (id_prestador, data);
CREATE INDEX IF NOT EXISTS idx_agendamentos_cliente ON agendamentos (id_cliente);

CREATE TABLE IF NOT EXISTS notificacoes (
  id         SERIAL PRIMARY KEY,
  id_usuario INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  mensagem   TEXT NOT NULL,
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notificacoes_usuario ON notificacoes (id_usuario);
