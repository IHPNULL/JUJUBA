// Leitura e agregacao dos acessos da versao web (API do GoatCounter).
// Usado por scripts/contar-acessos.mjs e scripts/gerar-painel.mjs.

export const DIAS_PADRAO = 90;

export function configuracao(dias = DIAS_PADRAO) {
  const token = process.env.GOATCOUNTER_TOKEN;
  if (!token) {
    throw new Error(
      "Falta GOATCOUNTER_TOKEN. Crie a chave em Settings > API no painel do\n" +
        "GoatCounter (ver docs/METRICAS.md §5).",
    );
  }

  const codigo = process.env.GOATCOUNTER_CODE ?? "jujuba";
  const base = process.env.GOATCOUNTER_API_BASE ?? `https://${codigo}.goatcounter.com`;

  return { token, base, codigo, dias };
}

// A API quer date-time arredondado na hora.
function horaCheia(data) {
  return `${data.toISOString().slice(0, 13)}:00:00Z`;
}

export async function buscarDiario({ token, base, dias }) {
  // `fim` sobe para a proxima hora cheia: arredondar para baixo cortaria os
  // acessos da hora corrente.
  const fim = new Date();
  fim.setUTCHours(fim.getUTCHours() + 1, 0, 0, 0);

  const inicio = new Date(fim);
  inicio.setUTCDate(inicio.getUTCDate() - (dias - 1));
  inicio.setUTCHours(0, 0, 0, 0);

  const url = new URL(`${base}/api/v0/stats/total`);
  url.searchParams.set("start", horaCheia(inicio));
  url.searchParams.set("end", horaCheia(fim));

  const resposta = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });

  if (!resposta.ok) {
    const corpo = await resposta.text();
    throw new Error(
      `GoatCounter respondeu ${resposta.status} para ${url.pathname}\n${corpo.slice(0, 300)}`,
    );
  }

  const { stats = [], total = 0 } = await resposta.json();

  return {
    total,
    dias: stats
      .map((s) => ({ dia: s.day, visitantes: s.daily ?? 0 }))
      .sort((a, b) => a.dia.localeCompare(b.dia)),
  };
}

// Segunda-feira da semana ISO de uma data YYYY-MM-DD, como rotulo.
export function inicioDaSemana(dia) {
  const data = new Date(`${dia}T00:00:00Z`);
  const diaDaSemana = (data.getUTCDay() + 6) % 7; // 0 = segunda
  data.setUTCDate(data.getUTCDate() - diaDaSemana);
  return data.toISOString().slice(0, 10);
}

function agrupar(dias, chave) {
  const mapa = new Map();
  for (const { dia, visitantes } of dias) {
    const k = chave(dia);
    mapa.set(k, (mapa.get(k) ?? 0) + visitantes);
  }
  return [...mapa].map(([periodo, visitantes]) => ({ periodo, visitantes }));
}

export function agregar(diario) {
  return {
    porDia: diario.map(({ dia, visitantes }) => ({ periodo: dia, visitantes })),
    porSemana: agrupar(diario, inicioDaSemana),
    porMes: agrupar(diario, (dia) => dia.slice(0, 7)),
  };
}

/** Busca e agrega numa chamada so. */
export async function coletarAcessos(dias = DIAS_PADRAO) {
  const config = configuracao(dias);
  const { total, dias: diario } = await buscarDiario(config);
  return { codigo: config.codigo, dias, total, ...agregar(diario) };
}

export const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function comoDia(dia) {
  const [ano, mes, d] = dia.split("-");
  return `${d}/${mes}/${ano}`;
}

export function comoMes(mes) {
  const [ano, m] = mes.split("-");
  return `${MESES[Number(m) - 1]}/${ano}`;
}
