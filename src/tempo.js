// "Agora" no fuso do negócio (padrão: Brasília), no formato { data: 'AAAA-MM-DD', hora: 'HH:MM' }.
function agoraLocal(tz = process.env.APP_TZ || 'America/Sao_Paulo') {
  const s = new Date().toLocaleString('sv-SE', { timeZone: tz }); // "2026-10-09 23:15:04"
  return { data: s.slice(0, 10), hora: s.slice(11, 16) };
}

module.exports = { agoraLocal };
