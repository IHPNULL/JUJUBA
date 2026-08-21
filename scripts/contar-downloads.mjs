#!/usr/bin/env node
// Conta quantas vezes os arquivos das Releases (o .apk, por exemplo) foram
// baixados. O proprio GitHub ja guarda esse numero por arquivo publicado
// (`download_count`); aqui so lemos a API publica e somamos — nada e
// adicionado ao app, nenhum dado de quem baixou e coletado.
//
//   npm run downloads              # todas as releases
//   npm run downloads -- --json    # saida em JSON, para colar em outro lugar
//
// Repositorio privado ou limite de requisicoes atingido: exporte um token
// (`GITHUB_TOKEN=ghp_...`) antes de rodar. `JUJUBA_REPO=dono/repo` aponta para
// outro repositorio e `JUJUBA_API_BASE` troca a URL da API (usado em teste).

import { execFileSync } from "node:child_process";

const API = process.env.JUJUBA_API_BASE ?? "https://api.github.com";

// Descobre `dono/repo` pelo remoto `origin`; da para forcar com JUJUBA_REPO.
function repositorioAlvo() {
  if (process.env.JUJUBA_REPO) return process.env.JUJUBA_REPO;
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;

  try {
    const url = execFileSync("git", ["config", "--get", "remote.origin.url"], {
      encoding: "utf8",
    }).trim();
    const achado = url.match(/github\.com[/:]([^/]+)\/(.+?)(?:\.git)?$/);
    if (achado) return `${achado[1]}/${achado[2]}`;
  } catch {
    // sem git ou sem remoto: cai no padrao abaixo
  }

  return "ihpnull/JUJUBA";
}

async function buscarReleases(repo) {
  const cabecalhos = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "jujuba-contar-downloads",
  };
  if (process.env.GITHUB_TOKEN) {
    cabecalhos.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const releases = [];
  for (let pagina = 1; ; pagina += 1) {
    const url = `${API}/repos/${repo}/releases?per_page=100&page=${pagina}`;
    const resposta = await fetch(url, { headers: cabecalhos });

    if (!resposta.ok) {
      const corpo = await resposta.text();
      throw new Error(
        `GitHub respondeu ${resposta.status} para ${url}\n${corpo.slice(0, 300)}`,
      );
    }

    const lote = await resposta.json();
    releases.push(...lote);
    if (lote.length < 100) return releases;
  }
}

function resumir(releases) {
  const porRelease = releases.map((release) => ({
    tag: release.tag_name,
    nome: release.name || release.tag_name,
    publicadaEm: release.published_at,
    rascunho: release.draft,
    arquivos: (release.assets ?? []).map((asset) => ({
      nome: asset.name,
      downloads: asset.download_count,
      tamanhoMb: +(asset.size / 1024 / 1024).toFixed(1),
    })),
  }));

  for (const release of porRelease) {
    release.downloads = release.arquivos.reduce((soma, a) => soma + a.downloads, 0);
  }

  return {
    total: porRelease.reduce((soma, r) => soma + r.downloads, 0),
    releases: porRelease,
  };
}

function imprimir({ total, releases }, repo) {
  if (releases.length === 0) {
    console.log(`Nenhuma release publicada ainda em ${repo}.`);
    return;
  }

  console.log(`Downloads das releases de ${repo}\n`);

  for (const release of releases) {
    const marca = release.rascunho ? " (rascunho)" : "";
    const data = release.publicadaEm
      ? new Date(release.publicadaEm).toLocaleDateString("pt-BR")
      : "sem data";
    console.log(`${release.nome}${marca} — ${data} — ${release.downloads} download(s)`);

    if (release.arquivos.length === 0) {
      console.log("  (sem arquivos anexados)");
    }
    for (const arquivo of release.arquivos) {
      console.log(`  ${arquivo.nome} (${arquivo.tamanhoMb} MB): ${arquivo.downloads}`);
    }
    console.log("");
  }

  console.log(`Total: ${total} download(s) em ${releases.length} release(s).`);
}

async function main() {
  const repo = repositorioAlvo();
  const releases = await buscarReleases(repo);
  const resumo = resumir(releases);

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify({ repo, ...resumo }, null, 2));
    return;
  }

  imprimir(resumo, repo);
}

main().catch((erro) => {
  console.error(erro.message);
  process.exitCode = 1;
});
