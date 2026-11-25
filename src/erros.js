// Erro com status HTTP e utilitário para rotas assíncronas do Express 4.
// campo (opcional) diz à interface qual campo do formulário está inválido.
class ErroHttp extends Error {
  constructor(status, mensagem, campo = null) {
    super(mensagem);
    this.status = status;
    this.campo = campo;
  }
}

const rota = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { ErroHttp, rota };
