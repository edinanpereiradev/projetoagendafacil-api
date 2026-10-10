// Dados de demonstração: npm run seed (não duplica se já existir)
const bcrypt = require('bcryptjs');
const db = require('./db');

async function main() {
  await db.iniciarBanco();
  const hash = await bcrypt.hash('123456', 10);

  const existe = await db.query("SELECT id FROM usuarios WHERE email = 'lays@studiolayskarla.com'");
  if (existe.rows[0]) {
    console.log('Dados de demonstração já existem. Nada a fazer.');
    return db.pool.end();
  }

  const prest = await db.query(
    `INSERT INTO usuarios (nome, email, senha_hash, tipo, nome_negocio, especialidade)
     VALUES ('Lays Karla', 'lays@studiolayskarla.com', $1, 'prestador', 'Studio Lays Karla', 'Sobrancelhas e cílios')
     RETURNING id`,
    [hash]
  );
  const idPrestador = prest.rows[0].id;

  await db.query(
    `INSERT INTO usuarios (nome, email, senha_hash, tipo, telefone)
     VALUES ('Juliana', 'juliana@email.com', $1, 'cliente', '(86) 99999-0000')`,
    [hash]
  );

  for (const [nome, preco, duracao] of [['Design de sobrancelhas', 35, 30], ['Design com henna', 50, 45], ['Limpeza de pele', 90, 60]]) {
    await db.query('INSERT INTO servicos (id_prestador, nome, preco, duracao_min) VALUES ($1, $2, $3, $4)', [idPrestador, nome, preco, duracao]);
  }
  for (let dia = 1; dia <= 5; dia++) {
    await db.query(
      `INSERT INTO disponibilidades (id_prestador, dia_semana, hora_inicio, hora_fim)
       VALUES ($1, $2, '09:00', '12:00'), ($1, $2, '14:00', '18:00')`,
      [idPrestador, dia]
    );
  }
  console.log('Pronto. Prestador: lays@studiolayskarla.com | Cliente: juliana@email.com | senha: 123456');
  await db.pool.end();
}

main().catch((erro) => { console.error(erro); process.exit(1); });
