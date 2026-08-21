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

import { coletarAcessos, comoDia, comoMes, DIAS_PADRAO } from "./lib/acessos.mjs";

function argumento(nome) {
  const achado = process.argv.find((a) => a.startsWith(`--${nome}=`));
  return achado ? achado.slice(nome.length + 3) : null;
}

function diasPedidos() {
  const bruto = argumento("dias");
  if (bruto === null) return DIAS_PADRAO;

  const dias = Number(bruto);
  if (!Number.isInteger(dias) || dias < 1) {
    throw new Error(`--dias precisa ser um inteiro positivo (recebido: ${bruto}).`);
  }
  return dias;
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

async function main() {
  const dias = diasPedidos();
  const acessos = await coletarAcessos(dias);

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(acessos, null, 2));
    return;
  }

  console.log(`Acessos da versao web nos ultimos ${dias} dias\n`);
  tabela("Por dia", acessos.porDia.slice(-14), comoDia);
  tabela("Por semana (segunda a domingo)", acessos.porSemana, (d) => `semana de ${comoDia(d)}`);
  tabela("Por mes", acessos.porMes, comoMes);
  console.log(`Total no periodo: ${acessos.total} visitante(s).`);
  console.log(
    "Cada numero e de visitantes unicos naquele dia; as somas por semana e mes\n" +
      "contam de novo quem voltou em outro dia.",
  );
}

main().catch((erro) => {
  console.error(erro.message);
  process.exitCode = 1;
});
