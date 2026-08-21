#!/usr/bin/env node
// Conta os acessos da versao web (GitHub Pages) por dia, semana e mes, lendo a
// API do GoatCounter. Ver docs/METRICAS.md §5 para a configuracao inicial.
//
//   GOATCOUNTER_TOKEN=... npm run acessos
//   GOATCOUNTER_TOKEN=... npm run acessos -- --dias=180
//   GOATCOUNTER_TOKEN=... npm run acessos -- --json
//
// Variaveis: GOATCOUNTER_CODE (subdominio do site, padrao "jujuba"),
// GOATCOUNTER_TOKEN (chave de API, obrigatoria) e GOATCOUNTER_API_BASE
// (troca a URL da API; usado em teste).

const DIAS_PADRAO = 90;

function argumento(nome) {
  const achado = process.argv.find((a) => a.startsWith(`--${nome}=`));
  return achado ? achado.slice(nome.length + 3) : null;
}

function configuracao() {
  const token = process.env.GOATCOUNTER_TOKEN;
  if (!token) {
    throw new Error(
      "Falta GOATCOUNTER_TOKEN. Crie a chave em Settings > API no painel do\n" +
        "GoatCounter e rode: GOATCOUNTER_TOKEN=... npm run acessos",
    );
  }

  const codigo = process.env.GOATCOUNTER_CODE ?? "jujuba";
  const base = process.env.GOATCOUNTER_API_BASE ?? `https://${codigo}.goatcounter.com`;

  const dias = Number(argumento("dias") ?? DIAS_PADRAO);
  if (!Number.isInteger(dias) || dias < 1) {
    throw new Error(`--dias precisa ser um inteiro positivo (recebido: ${argumento("dias")}).`);
  }

  return { token, base, dias };
}

// A API quer date-time arredondado na hora.
function horaCheia(data) {
  return `${data.toISOString().slice(0, 13)}:00:00Z`;
}

async function buscarDiario({ token, base, dias }) {
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
function inicioDaSemana(dia) {
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

function agregar(diario) {
  return {
    porDia: diario.map(({ dia, visitantes }) => ({ periodo: dia, visitantes })),
    porSemana: agrupar(diario, inicioDaSemana),
    porMes: agrupar(diario, (dia) => dia.slice(0, 7)),
  };
}

function tabela(titulo, linhas, formatar) {
  console.log(`## ${titulo}\n`);

  if (linhas.length === 0) {
    console.log("(sem acessos no periodo)\n");
    return;
  }

  const largura = Math.max(...linhas.map((l) => formatar(l.periodo).length));
  for (const linha of linhas) {
    const rotulo = formatar(linha.periodo).padEnd(largura);
    console.log(`${rotulo}  ${String(linha.visitantes).padStart(6)}`);
  }
  console.log("");
}

const MESES = [
  "janeiro", "fevereiro", "marco", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function comoDia(dia) {
  const [ano, mes, d] = dia.split("-");
  return `${d}/${mes}/${ano}`;
}

function comoMes(mes) {
  const [ano, m] = mes.split("-");
  return `${MESES[Number(m) - 1]}/${ano}`;
}

async function main() {
  const config = configuracao();
  const { total, dias } = await buscarDiario(config);
  const agregado = agregar(dias);

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify({ total, ...agregado }, null, 2));
    return;
  }

  console.log(`Acessos da versao web nos ultimos ${config.dias} dias\n`);
  tabela("Por dia", agregado.porDia.slice(-14), comoDia);
  tabela("Por semana (segunda a domingo)", agregado.porSemana, (d) => `semana de ${comoDia(d)}`);
  tabela("Por mes", agregado.porMes, comoMes);
  console.log(`Total no periodo: ${total} visitante(s).`);
  console.log(
    "Cada numero e de visitantes unicos naquele dia; as somas por semana e mes\n" +
      "contam de novo quem voltou em outro dia.",
  );
}

main().catch((erro) => {
  console.error(erro.message);
  process.exitCode = 1;
});
