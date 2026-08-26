/**
 * Destino do botão "Feedback": um formulário do Google Forms aberto no
 * navegador, sem login.
 *
 * A escolha foi formulário e não GitHub Issues porque abrir issue exige conta
 * no GitHub — muro que o público do app (aluno) não passa. Do lado de fora, um
 * script no próprio formulário transforma cada resposta em issue; o caminho
 * inteiro está em `docs/FEEDBACK.md`.
 *
 * Estas três constantes são o único ponto do app que muda se o formulário
 * mudar. Os nomes `entry.*` vêm do "link pré-preenchido" que o Google Forms
 * gera — não são escolhidos por nós.
 */
export const URL_FORMULARIO_FEEDBACK =
  "https://docs.google.com/forms/d/e/1FAIpQLSfPa4hkPYxIml2H6SALZMwai00RiTwHdOxJ8In88KJx6v5nMA/viewform";
export const CAMPO_VERSAO = "entry.403082854";
export const CAMPO_PLATAFORMA = "entry.444715354";

/**
 * "Plataforma" é múltipla escolha no formulário, e prefill de múltipla escolha
 * só pega quando o valor bate exatamente com uma das opções — daí a tradução
 * de `Platform.OS` para as opções que existem lá.
 *
 * Android e iOS caem os dois em "App": a distinção se perde, e com ela a pista
 * de bug específico de um sistema. Se isso passar a doer, o conserto é no
 * formulário (trocar por resposta curta), não aqui.
 */
export function opcaoDePlataforma(os: string): "App" | "Web" {
  return os === "web" ? "Web" : "App";
}

interface ContextoDeFeedback {
  /** Versão do app; `undefined` quando o runtime não sabe informar. */
  versao: string | undefined;
  plataforma: string;
}

/**
 * Monta a URL do formulário já com versão e plataforma preenchidas, pra poupar
 * a ida e volta de "qual versão você usa?".
 *
 * Só esses dois campos saem do aparelho: nota, matéria e meta continuam no
 * SQLite local, como promete `docs/METRICAS.md`. O `usp=pp_url` é o que o
 * Google Forms exige para tratar a URL como pré-preenchida.
 */
export function montarUrlDeFeedback({ versao, plataforma }: ContextoDeFeedback): string {
  const parametros = new URLSearchParams({
    "usp": "pp_url",
    [CAMPO_VERSAO]: versao ?? "desconhecida",
    [CAMPO_PLATAFORMA]: opcaoDePlataforma(plataforma),
  });
  return `${URL_FORMULARIO_FEEDBACK}?${parametros.toString()}`;
}
