/**
 * "O que há de novo": o texto das novidades de cada versão e a regra de
 * quando mostrá-lo.
 *
 * A lista é escrita à mão, na primeira pessoa do app e para aluno — não é o
 * changelog técnico do repositório (esse já existe nas releases do GitHub,
 * geradas por `npm run release`). Ao subir a versão em `package.json`/
 * `app.json`, acrescente aqui a entrada correspondente; sem entrada para a
 * versão instalada, o modal simplesmente não aparece.
 */

export interface Novidade {
  /** Igual ao `version` de app.json — é a chave que casa com o app instalado. */
  versao: string;
  /** Uma frase por novidade, na ordem em que devem ser lidas. */
  itens: string[];
}

/** Mais nova primeiro (só a que casa com a versão instalada é usada). */
export const NOVIDADES: Novidade[] = [
  {
    versao: "1.9.0",
    itens: [
      "Esta telinha: sempre que o app for atualizado, ela abre uma vez contando o que mudou.",
      "Na versão do navegador, o mesmo texto fica no ícone de brilhos ali em cima, ao lado do foguete.",
    ],
  },
  {
    versao: "1.8.0",
    itens: [
      "Objetivo do ano: diga quantos pontos você quer somar e o app calcula o que falta em cada matéria.",
      "Sugestão de menor esforço, para saber onde vale a pena estudar primeiro.",
      "Aviso de recuperação quando a matéria começa a escapar.",
      "As notas que você digita agora aparecem em rosa, separadas das simuladas.",
      "Botão de feedback no topo da tela, para contar um problema ou pedir uma ideia.",
    ],
  },
];

/** Chave do rascunho que guarda a última versão cujas novidades já foram vistas. */
export const CHAVE_RASCUNHO_NOVIDADES = "novidades-vistas";

/** Payload do rascunho — objeto (e não a string crua) para caber campo novo depois. */
export function serializarVersaoVista(versao: string): string {
  return JSON.stringify({ versao });
}

/** Tolerante a dado corrompido/formato antigo: retorna `null` em vez de lançar. */
export function lerVersaoVista(json: string): string | null {
  let payload: unknown;
  try {
    payload = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof payload !== "object" || payload === null) return null;
  const { versao } = payload as Record<string, unknown>;
  return typeof versao === "string" ? versao : null;
}

/**
 * A novidade a mostrar agora, ou `null` para não mostrar nada.
 *
 * Mostra quando a versão instalada é diferente da última já vista — o que
 * cobre os dois casos pedidos: a primeira abertura depois de instalar
 * (`versaoVista === null`) e toda atualização seguinte. Comparação por
 * igualdade, e não por "é maior que": num rollback (ou num APK antigo
 * reinstalado) o certo é mostrar de novo as novidades daquela versão, não
 * ficar em silêncio.
 *
 * `versaoAtual` vem de `Constants.expoConfig?.version` e pode ser `undefined`
 * quando o runtime não sabe informar; nesse caso não há o que comparar nem o
 * que gravar, então não mostramos nada.
 */
export function novidadeParaMostrar(
  versaoAtual: string | undefined,
  versaoVista: string | null,
): Novidade | null {
  if (versaoVista === versaoAtual) return null;
  return novidadeDaVersao(versaoAtual);
}

/**
 * O texto escrito para uma versão, sem olhar o que já foi visto — é o que a
 * web mostra quando o aluno toca no ícone de novidades (lá o modal nunca abre
 * sozinho; ver `useNovidades`).
 */
export function novidadeDaVersao(versao: string | undefined): Novidade | null {
  if (!versao) return null;
  return NOVIDADES.find((novidade) => novidade.versao === versao) ?? null;
}
