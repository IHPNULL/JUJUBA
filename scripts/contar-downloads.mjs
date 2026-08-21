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

import { coletarDownloads } from "./lib/downloads.mjs";

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
  const resumo = await coletarDownloads();

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(resumo, null, 2));
    return;
  }

  imprimir(resumo, resumo.repo);
}

main().catch((erro) => {
  console.error(erro.message);
  process.exitCode = 1;
});
