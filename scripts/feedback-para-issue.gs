/**
 * Gatilho do Google Apps Script: cada resposta do formulário de feedback vira
 * uma issue no GitHub.
 *
 * Este arquivo NÃO roda no app nem no repositório — mora aqui só para ficar
 * versionado junto do resto. O código de verdade é colado no editor de Apps
 * Script do formulário. Passo a passo em `docs/FEEDBACK.md`.
 *
 * Privacidade: o e-mail que o aluno digita NÃO é copiado para a issue. O
 * repositório é público, e endereço de aluno em issue pública fica indexado
 * para sempre. Para responder alguém, consulte a planilha de respostas.
 */

const REPOSITORIO = "IHPNULL/JUJUBA";

/** Títulos das perguntas, exatamente como estão no formulário. */
const PERGUNTA_TIPO = "Isso é um problema ou uma ideia?";
const PERGUNTA_RELATO = "Conta o que aconteceu (ou o que você queria)";
const PERGUNTA_EMAIL = "Caso queira uma resposta adicione seu e-mail (Não obrigatório)";
const PERGUNTA_VERSAO = "Versao";
const PERGUNTA_PLATAFORMA = "Plataforma";

/** Rótulo aplicado na issue conforme a resposta do seletor. */
const ROTULO_POR_TIPO = { Problema: "bug", Ideia: "enhancement" };

/**
 * Gatilho "Ao enviar formulário". Precisa ser instalado uma vez — ver
 * `docs/FEEDBACK.md`.
 */
function aoEnviarFormulario(evento) {
  const respostas = lerRespostas(evento);
  const relato = respostas[PERGUNTA_RELATO];

  if (!relato) {
    // Sem relato não há issue que preste; a resposta continua na planilha.
    console.warn("Resposta sem relato — nenhuma issue criada.");
    return;
  }

  criarIssue({
    titulo: montarTitulo(respostas[PERGUNTA_TIPO], relato),
    corpo: montarCorpo(respostas),
    rotulo: ROTULO_POR_TIPO[respostas[PERGUNTA_TIPO]],
  });
}

/** Vira as respostas em um objeto { título da pergunta: resposta }. */
function lerRespostas(evento) {
  const respostas = {};
  evento.response.getItemResponses().forEach((item) => {
    respostas[item.getItem().getTitle()] = String(item.getResponse() || "").trim();
  });
  return respostas;
}

/**
 * Primeira linha do relato, cortada em 70 caracteres — título de issue longo
 * fica ilegível na listagem do GitHub.
 */
function montarTitulo(tipo, relato) {
  const primeiraLinha = relato.split("\n")[0].trim();
  const resumo = primeiraLinha.length > 70 ? `${primeiraLinha.slice(0, 69)}…` : primeiraLinha;
  return `[${tipo || "Feedback"}] ${resumo}`;
}

/** Corpo da issue. O e-mail fica de fora de propósito — ver cabeçalho. */
function montarCorpo(respostas) {
  const versao = respostas[PERGUNTA_VERSAO] || "não informada";
  const plataforma = respostas[PERGUNTA_PLATAFORMA] || "não informada";
  const temEmail = Boolean(respostas[PERGUNTA_EMAIL]);

  return [
    respostas[PERGUNTA_RELATO],
    "",
    "---",
    `**Versão:** ${versao} · **Plataforma:** ${plataforma}`,
    temEmail
      ? "_A pessoa deixou e-mail para resposta — está na planilha de respostas, fora desta issue pública._"
      : "_Sem e-mail para resposta._",
    "_Enviado pelo botão de feedback do app._",
  ].join("\n");
}

/**
 * Cria a issue. Se o rótulo não existir no repositório o GitHub recusa a
 * requisição inteira, então uma falha com rótulo é repetida sem ele — melhor
 * uma issue sem etiqueta do que feedback perdido.
 */
function criarIssue({ titulo, corpo, rotulo }) {
  const resposta = enviarAoGitHub({ title: titulo, body: corpo, labels: rotulo ? [rotulo] : [] });

  if (resposta.getResponseCode() === 201) return;

  console.warn(`GitHub recusou (${resposta.getResponseCode()}): ${resposta.getContentText()}`);

  if (!rotulo) throw new Error(`Não foi possível criar a issue: ${resposta.getContentText()}`);

  const semRotulo = enviarAoGitHub({ title: titulo, body: corpo });
  if (semRotulo.getResponseCode() !== 201) {
    throw new Error(`Não foi possível criar a issue: ${semRotulo.getContentText()}`);
  }
}

function enviarAoGitHub(payload) {
  const token = PropertiesService.getScriptProperties().getProperty("GITHUB_TOKEN");
  if (!token) throw new Error("Falta a propriedade de script GITHUB_TOKEN — ver docs/FEEDBACK.md.");

  return UrlFetchApp.fetch(`https://api.github.com/repos/${REPOSITORIO}/issues`, {
    method: "post",
    contentType: "application/json",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
}
