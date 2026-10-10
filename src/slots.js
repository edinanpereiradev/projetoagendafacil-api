// US06 — cálculo dos horários livres. Função pura, sem acesso a banco.
const paraMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const paraHora = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

// 0 = domingo ... 6 = sábado
const diaDaSemana = (data) => new Date(`${data}T00:00:00Z`).getUTCDay();

/**
 * @param {object} p
 * @param {string} p.data        AAAA-MM-DD
 * @param {number} p.duracaoMin  duração do serviço
 * @param {{horaInicio:string,horaFim:string}[]} p.janelas  disponibilidade do dia da semana
 * @param {{hora:string,duracaoMin:number}[]} p.ocupados     agendamentos confirmados no dia
 * @param {{data:string,hora:string}} [p.agora]              se informado, esconde horários passados
 * @returns {string[]} horários de início, ordenados (HH:MM)
 */
function gerarHorarios({ data, duracaoMin, janelas, ocupados, agora }) {
  if (agora && data < agora.data) return [];
  const minimo = agora && agora.data === data ? paraMin(agora.hora) : -1;

  const intervalosOcupados = ocupados.map((o) => {
    const inicio = paraMin(o.hora);
    return [inicio, inicio + o.duracaoMin];
  });

  const livres = new Set();
  for (const janela of janelas) {
    const fim = paraMin(janela.horaFim);
    for (let t = paraMin(janela.horaInicio); t + duracaoMin <= fim; t += duracaoMin) {
      if (t < minimo) continue;
      const conflita = intervalosOcupados.some(([ini, fimOcupado]) => t < fimOcupado && t + duracaoMin > ini);
      if (!conflita) livres.add(t);
    }
  }
  return [...livres].sort((a, b) => a - b).map(paraHora);
}

module.exports = { gerarHorarios, diaDaSemana, paraMin, paraHora };
