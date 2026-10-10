const jwt = require('jsonwebtoken');
const config = require('./config');

function autenticar(req, res, next) {
  const [esquema, token] = (req.headers.authorization || '').split(' ');
  if (esquema !== 'Bearer' || !token) {
    return res.status(401).json({ erro: 'Faça login para continuar.' });
  }
  try {
    req.usuario = jwt.verify(token, config.jwtSecret); // { id, tipo, nome }
    next();
  } catch {
    res.status(401).json({ erro: 'Sessão expirada. Faça login novamente.' });
  }
}

const exigirTipo = (tipo) => (req, res, next) =>
  req.usuario.tipo === tipo
    ? next()
    : res.status(403).json({ erro: `Esta ação é exclusiva para ${tipo}.` });

module.exports = { autenticar, exigirTipo };
