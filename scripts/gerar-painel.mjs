#!/usr/bin/env node
// Gera uma pagina unica com todas as metricas do Jujuba: downloads das
// Releases, acessos da versao web por dia/semana/mes, e o ponteiro para as
// instalacoes no painel do EAS.
//
//   GOATCOUNTER_TOKEN=... npm run metricas
//   GOATCOUNTER_TOKEN=... npm run metricas -- --dias=180 --saida=/tmp/painel.html
//
// O arquivo gerado e autocontido (sem CSS ou JS externo) e nao vai para o Git.
// Cada fonte e buscada de forma independente: se uma falhar, a pagina sai com
// as outras e um aviso no lugar da que faltou — um painel que nao abre por
// causa de um token vencido nao serve para nada.

import { writeFileSync } from "node:fs";
import { coletarDownloads } from "./lib/downloads.mjs";
import { coletarAcessos, comoDia, comoMes, DIAS_PADRAO } from "./lib/acessos.mjs";

const PAINEL_EAS = "https://expo.dev/accounts/ihpnull/projects/jujuba/insights";

function argumento(nome, padrao = null) {
  const achado = process.argv.find((a) => a.startsWith(`--${nome}=`));
  return achado ? achado.slice(nome.length + 3) : padrao;
}

function esc(valor) {
  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function tentar(rotulo, promessa) {
  try {
    return { ok: true, dados: await promessa };
  } catch (erro) {
    console.error(`aviso: ${rotulo} indisponivel — ${erro.message.split("\n")[0]}`);
    return { ok: false, erro: erro.message };
  }
}

function avisoDeFalha(titulo, erro) {
  return `<div class="falha">
      <strong>${esc(titulo)} não pôde ser carregado.</strong>
      <pre>${esc(erro)}</pre>
    </div>`;
}

function cartao(rotulo, valor, detalhe = "") {
  return `<div class="cartao">
      <span class="rotulo">${esc(rotulo)}</span>
      <span class="valor">${esc(valor)}</span>
      ${detalhe ? `<span class="detalhe">${esc(detalhe)}</span>` : ""}
    </div>`;
}

// Grafico de barras em SVG puro: sem biblioteca, sem requisicao externa.
function grafico(pontos) {
  if (pontos.length === 0) return "<p class=\"vazio\">Sem dados no período.</p>";

  const maximo = Math.max(...pontos.map((p) => p.visitantes), 1);
  const largura = 100 / pontos.length;

  const barras = pontos
    .map((ponto, i) => {
      const altura = (ponto.visitantes / maximo) * 100;
      const titulo = `${comoDia(ponto.periodo)}: ${ponto.visitantes}`;
      return `<rect x="${(i * largura).toFixed(3)}%" y="${(100 - altura).toFixed(3)}%"
        width="${(largura * 0.7).toFixed(3)}%" height="${altura.toFixed(3)}%"
        rx="1"><title>${esc(titulo)}</title></rect>`;
    })
    .join("\n      ");

  const primeiro = comoDia(pontos[0].periodo);
  const ultimo = comoDia(pontos[pontos.length - 1].periodo);

  return `<div class="grafico">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img"
           aria-label="Visitantes por dia, de ${esc(primeiro)} a ${esc(ultimo)}">
      ${barras}
      </svg>
      <div class="eixo"><span>${esc(primeiro)}</span><span>pico: ${maximo}</span><span>${esc(ultimo)}</span></div>
    </div>`;
}

function tabela(cabecalhos, linhas) {
  if (linhas.length === 0) return "<p class=\"vazio\">Sem dados no período.</p>";

  const cabecalho = cabecalhos.map((c) => `<th>${esc(c)}</th>`).join("");
  const corpo = linhas
    .map((linha) => `<tr>${linha.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
    .join("\n        ");

  return `<div class="tabela-rolavel"><table>
      <thead><tr>${cabecalho}</tr></thead>
      <tbody>
        ${corpo}
      </tbody>
    </table></div>`;
}

function secaoDownloads(resultado) {
  if (!resultado.ok) return avisoDeFalha("Downloads das Releases", resultado.erro);

  const { total, releases, repo } = resultado.dados;
  const comArquivos = releases.filter((r) => r.arquivos.length > 0);
  const maisBaixada = [...releases].sort((a, b) => b.downloads - a.downloads)[0];

  const linhas = releases.map((release) => [
    release.nome + (release.rascunho ? " (rascunho)" : ""),
    release.publicadaEm
      ? new Date(release.publicadaEm).toLocaleDateString("pt-BR")
      : "—",
    release.arquivos.map((a) => a.nome).join(", ") || "sem arquivos",
    release.downloads,
  ]);

  return `<div class="cartoes">
      ${cartao("Downloads no total", total, `${comArquivos.length} release(s) com arquivo`)}
      ${maisBaixada ? cartao("Release mais baixada", maisBaixada.downloads, maisBaixada.nome) : ""}
    </div>
    ${tabela(["Release", "Publicada", "Arquivos", "Downloads"], linhas)}
    <p class="fonte">Fonte: contador do próprio GitHub em <code>${esc(repo)}</code>. Um
    download não é uma instalação — a mesma pessoa baixando duas vezes conta duas.</p>`;
}

function secaoAcessos(resultado) {
  if (!resultado.ok) return avisoDeFalha("Acessos da versão web", resultado.erro);

  const { total, porDia, porSemana, porMes, dias } = resultado.dados;
  const ultimos30 = porDia.slice(-30);
  const ontem = porDia[porDia.length - 2];
  const mesAtual = porMes[porMes.length - 1];

  return `<div class="cartoes">
      ${cartao("Visitantes web", total, `últimos ${dias} dias`)}
      ${ontem ? cartao("Ontem", ontem.visitantes, comoDia(ontem.periodo)) : ""}
      ${mesAtual ? cartao("Mês corrente", mesAtual.visitantes, comoMes(mesAtual.periodo)) : ""}
    </div>
    <h3>Por dia (últimos 30)</h3>
    ${grafico(ultimos30)}
    <div class="lado-a-lado">
      <div>
        <h3>Por semana</h3>
        ${tabela(
          ["Semana de", "Visitantes"],
          porSemana.slice(-12).map((s) => [comoDia(s.periodo), s.visitantes]),
        )}
      </div>
      <div>
        <h3>Por mês</h3>
        ${tabela(
          ["Mês", "Visitantes"],
          porMes.map((m) => [comoMes(m.periodo), m.visitantes]),
        )}
      </div>
    </div>
    <p class="fonte">Fonte: GoatCounter, sem cookie. Cada número é de visitantes
    únicos naquele dia; as somas por semana e por mês contam de novo quem voltou
    em outro dia.</p>`;
}

function pagina({ downloads, acessos, geradoEm, dias }) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Métricas do Jujuba</title>
<style>
  :root {
    --fundo: #fbfbfd; --superficie: #fff; --borda: #e4e4ea;
    --texto: #16161d; --suave: #6b6b78; --destaque: #7c5cd6; --erro: #b3261e;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --fundo: #131318; --superficie: #1c1c23; --borda: #2e2e38;
      --texto: #ececf1; --suave: #9a9aa8; --destaque: #a98bf0; --erro: #f2b8b5;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 2rem 1.25rem 4rem; background: var(--fundo); color: var(--texto);
    font: 16px/1.6 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  main { max-width: 60rem; margin: 0 auto; }
  h1 { font-size: 1.75rem; margin: 0 0 .25rem; letter-spacing: -.02em; }
  h2 { font-size: 1.15rem; margin: 2.5rem 0 1rem; letter-spacing: -.01em; }
  h3 { font-size: .95rem; margin: 1.5rem 0 .5rem; color: var(--suave); font-weight: 600; }
  .sub { color: var(--suave); margin: 0 0 2rem; font-size: .9rem; }
  .cartoes { display: flex; flex-wrap: wrap; gap: .75rem; margin: 1rem 0; }
  .cartao {
    flex: 1 1 10rem; display: flex; flex-direction: column; gap: .15rem;
    background: var(--superficie); border: 1px solid var(--borda);
    border-radius: .75rem; padding: 1rem 1.1rem;
  }
  .rotulo { font-size: .78rem; color: var(--suave); text-transform: uppercase; letter-spacing: .06em; }
  .valor { font-size: 2rem; font-weight: 650; letter-spacing: -.03em; font-variant-numeric: tabular-nums; }
  .detalhe { font-size: .82rem; color: var(--suave); }
  table { width: 100%; border-collapse: collapse; font-size: .9rem; }
  th, td { text-align: left; padding: .5rem .6rem; border-bottom: 1px solid var(--borda); }
  th { font-size: .78rem; text-transform: uppercase; letter-spacing: .05em; color: var(--suave); font-weight: 600; }
  td:last-child, th:last-child { text-align: right; font-variant-numeric: tabular-nums; }
  .tabela-rolavel { overflow-x: auto; }
  .grafico { background: var(--superficie); border: 1px solid var(--borda); border-radius: .75rem; padding: 1rem; }
  .grafico svg { width: 100%; height: 8rem; display: block; }
  .grafico rect { fill: var(--destaque); }
  .eixo { display: flex; justify-content: space-between; font-size: .78rem; color: var(--suave); margin-top: .5rem; }
  .lado-a-lado { display: grid; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); gap: 1.5rem; }
  .fonte { font-size: .84rem; color: var(--suave); margin: 1rem 0 0; }
  .falha { border: 1px solid var(--erro); border-radius: .75rem; padding: 1rem; margin: 1rem 0; }
  .falha pre { white-space: pre-wrap; font-size: .8rem; color: var(--suave); margin: .5rem 0 0; }
  .vazio { color: var(--suave); font-size: .9rem; }
  code { font-size: .85em; }
  a { color: var(--destaque); }
</style>
</head>
<body>
<main>
  <h1>Métricas do Jujuba</h1>
  <p class="sub">Gerado em ${esc(geradoEm)} · janela de ${esc(dias)} dias ·
  regenere com <code>npm run metricas</code></p>

  <h2>Downloads do .apk</h2>
  ${secaoDownloads(downloads)}

  <h2>Acessos da versão web</h2>
  ${secaoAcessos(acessos)}

  <h2>Instalações do app Android</h2>
  <p class="fonte">O <code>expo-insights</code> envia um evento por abertura do app,
  mas a Expo não expõe API pública para ler esses números — eles ficam só no
  painel: <a href="${esc(PAINEL_EAS)}">Insights do projeto no EAS</a>.
  Reinstalar conta como instalação nova, e desinstalação não é detectada.</p>
</main>
</body>
</html>
`;
}

async function main() {
  const dias = Number(argumento("dias", String(DIAS_PADRAO)));
  if (!Number.isInteger(dias) || dias < 1) {
    throw new Error(`--dias precisa ser um inteiro positivo (recebido: ${argumento("dias")}).`);
  }

  const saida = argumento("saida", "painel-metricas.html");

  const [downloads, acessos] = await Promise.all([
    tentar("downloads das Releases", coletarDownloads()),
    tentar("acessos da web", coletarAcessos(dias)),
  ]);

  const geradoEm = new Date().toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" });
  writeFileSync(saida, pagina({ downloads, acessos, geradoEm, dias }));

  console.log(`Painel gerado em ${saida}`);
  if (!downloads.ok || !acessos.ok) {
    console.log("Alguma fonte falhou — a pagina foi gerada com o aviso no lugar dela.");
  }
}

main().catch((erro) => {
  console.error(erro.message);
  process.exitCode = 1;
});
