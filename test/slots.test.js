const test = require('node:test');
const assert = require('node:assert/strict');
const { gerarHorarios, diaDaSemana } = require('../src/slots');
const { dataValida, horaValida, inteiro, formatarData } = require('../src/validacao');
const { agoraLocal } = require('../src/tempo');

const manha = [{ horaInicio: '09:00', horaFim: '12:00' }];
const base = { data: '2026-10-12', janelas: manha, ocupados: [] };

test('gera horários consecutivos dentro da janela', () => {
  assert.deepEqual(gerarHorarios({ ...base, duracaoMin: 60 }), ['09:00', '10:00', '11:00']);
});

test('não gera horário que termina depois do fim da janela', () => {
  assert.deepEqual(gerarHorarios({ ...base, duracaoMin: 45 }), ['09:00', '09:45', '10:30', '11:15']);
  assert.deepEqual(gerarHorarios({ ...base, duracaoMin: 90 }), ['09:00', '10:30']);
});

test('remove horários ocupados', () => {
  const r = gerarHorarios({ ...base, duracaoMin: 60, ocupados: [{ hora: '10:00', duracaoMin: 60 }] });
  assert.deepEqual(r, ['09:00', '11:00']);
});

test('remove horários que sobrepõem parcialmente um agendamento', () => {
  const r = gerarHorarios({ ...base, duracaoMin: 60, ocupados: [{ hora: '09:30', duracaoMin: 30 }] });
  assert.deepEqual(r, ['10:00', '11:00']);
});

test('junta duas janelas no mesmo dia e ordena', () => {
  const r = gerarHorarios({
    ...base,
    duracaoMin: 120,
    janelas: [{ horaInicio: '14:00', horaFim: '18:00' }, { horaInicio: '09:00', horaFim: '12:00' }],
  });
  assert.deepEqual(r, ['09:00', '14:00', '16:00']);
});

test('sem janelas não há horários', () => {
  assert.deepEqual(gerarHorarios({ ...base, janelas: [], duracaoMin: 30 }), []);
});

test('no dia de hoje esconde horários que já passaram', () => {
  const r = gerarHorarios({ ...base, duracaoMin: 60, agora: { data: '2026-10-12', hora: '10:30' } });
  assert.deepEqual(r, ['11:00']);
});

test('dias passados não têm horários; dias futuros não são afetados', () => {
  assert.deepEqual(gerarHorarios({ ...base, duracaoMin: 60, agora: { data: '2026-10-13', hora: '08:00' } }), []);
  assert.deepEqual(
    gerarHorarios({ ...base, duracaoMin: 60, agora: { data: '2026-10-09', hora: '23:00' } }),
    ['09:00', '10:00', '11:00']
  );
});

test('dia da semana: 12/10/2026 é segunda (1) e 11/10/2026 é domingo (0)', () => {
  assert.equal(diaDaSemana('2026-10-12'), 1);
  assert.equal(diaDaSemana('2026-10-11'), 0);
});

test('validações de data, hora e inteiro', () => {
  assert.equal(dataValida('2026-10-12'), true);
  assert.equal(dataValida('2026-02-30'), false);
  assert.equal(dataValida('12/10/2026'), false);
  assert.equal(horaValida('09:00'), true);
  assert.equal(horaValida('9:00'), false);
  assert.equal(horaValida('24:00'), false);
  assert.equal(inteiro('5'), 5);
  assert.equal(inteiro('0'), null);
  assert.equal(inteiro('abc'), null);
  assert.equal(formatarData('2026-10-12'), '12/10/2026');
});

test('agoraLocal devolve data e hora no formato esperado', () => {
  const { data, hora } = agoraLocal();
  assert.match(data, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(hora, /^\d{2}:\d{2}$/);
});
