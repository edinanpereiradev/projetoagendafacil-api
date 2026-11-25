// Confere, no banco, que as senhas estão guardadas como hash BCrypt.
// Uso: npm run verificar-hash   (mostra só o prefixo do hash, nunca o hash inteiro)
const db = require('./db');

async function main() {
  const { rows } = await db.query('SELECT id, email, tipo, senha_hash FROM usuarios ORDER BY id');
  const formatoBcrypt = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
  let invalidos = 0;
  for (const u of rows) {
    const ok = formatoBcrypt.test(u.senha_hash);
    if (!ok) invalidos += 1;
    console.log(`${ok ? 'OK    ' : 'ERRO  '} #${u.id} ${u.email} (${u.tipo}) prefixo: ${u.senha_hash.slice(0, 7)}`);
  }
  console.log(invalidos === 0
    ? `\n${rows.length} usuário(s): todas as senhas estão em formato BCrypt.`
    : `\n${invalidos} senha(s) fora do formato BCrypt!`);
  await db.pool.end();
  process.exit(invalidos === 0 ? 0 : 1);
}

main().catch((erro) => { console.error(erro); process.exit(1); });
