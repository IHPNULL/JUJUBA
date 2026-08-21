// Leitura dos contadores de download das Releases do GitHub.
// Usado por scripts/contar-downloads.mjs e scripts/gerar-painel.mjs.

import { execFileSync } from "node:child_process";

const API = process.env.JUJUBA_API_BASE ?? "https://api.github.com";

// Descobre `dono/repo` pelo remoto `origin`; da para forcar com JUJUBA_REPO.
export function repositorioAlvo() {
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

export async function buscarReleases(repo) {
  const cabecalhos = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "jujuba-metricas",
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

export function resumir(releases) {
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

/** Busca e resume numa chamada so. */
export async function coletarDownloads(repo = repositorioAlvo()) {
  return { repo, ...resumir(await buscarReleases(repo)) };
}
