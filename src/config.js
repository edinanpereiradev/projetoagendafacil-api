require('dotenv').config();

const producao = process.env.NODE_ENV === 'production';

if (!process.env.DATABASE_URL) {
  throw new Error('Defina DATABASE_URL (veja .env.example).');
}
if (producao && !process.env.JWT_SECRET) {
  throw new Error('Defina JWT_SECRET nas variáveis de ambiente.');
}

module.exports = {
  producao,
  porta: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'segredo-apenas-para-desenvolvimento',
  origensPermitidas: (process.env.CORS_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean),
};
