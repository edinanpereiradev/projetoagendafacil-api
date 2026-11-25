// Dados do usuário que podem sair pela API. Nunca inclui senha nem senha_hash.
const usuarioPublico = (u) => ({
  id: u.id,
  nome: u.nome,
  email: u.email,
  tipo: u.tipo,
  telefone: u.telefone,
  nomeNegocio: u.nome_negocio,
  especialidade: u.especialidade,
});

module.exports = { usuarioPublico };
