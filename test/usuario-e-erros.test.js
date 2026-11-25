const test = require('node:test');
const assert = require('node:assert/strict');
const { usuarioPublico } = require('../src/usuario');
const { ErroHttp } = require('../src/erros');

test('usuarioPublico nunca expõe senha nem hash', () => {
  const linhaDoBanco = {
    id: 1, nome: 'Juliana', email: 'juliana@email.com', tipo: 'cliente', telefone: '(86) 99999-0000',
    nome_negocio: null, especialidade: null, senha_hash: '$2a$10$abcdefghijklmnopqrstuv', senha: '123456'
  };
  const saida = usuarioPublico(linhaDoBanco);
  assert.deepEqual(Object.keys(saida).sort(), ['email', 'especialidade', 'id', 'nome', 'nomeNegocio', 'telefone', 'tipo']);
  const json = JSON.stringify(saida);
  assert.equal(json.includes('senha'), false);
  assert.equal(json.includes('$2a$'), false);
});

test('ErroHttp carrega status, mensagem e o campo opcional', () => {
  const comCampo = new ErroHttp(400, 'Informe o nome.', 'nome');
  assert.equal(comCampo.status, 400);
  assert.equal(comCampo.message, 'Informe o nome.');
  assert.equal(comCampo.campo, 'nome');
  assert.equal(new ErroHttp(404, 'Não achei').campo, null);
});
