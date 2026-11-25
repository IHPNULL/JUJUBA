import Decimal from "decimal.js";
import { chaveSimulado, Materia, NotasFrente } from "../../store/inicioSlice";

/**
 * Componentes digitados em cada frente, na ordem em que aparecem no cartão.
 * A SAEP fica de fora: é uma nota só por trimestre, para todas as frentes
 * (`InicioState.saep`), e nunca é preenchida pela simulação.
 */
export const COMPONENTES: (keyof NotasFrente)[] = ["at", "ao", "tarefa"];

export function paraDecimal(valor: string): Decimal {
  const limpo = valor.trim().replace(",", ".");
  if (limpo === "") return new Decimal(0);
  const numero = Number(limpo);
  return Number.isFinite(numero) ? new Decimal(numero) : new Decimal(0);
}

/**
 * Normaliza o texto digitado numa nota a cada tecla: zero à esquerda na
 * parte inteira some (mas um "0" sozinho fica, é o meio de digitar "0,5"),
 * e a parte decimal nunca passa de 2 dígitos. Não usa `toFixed` — o valor
 * ainda está sendo digitado, então arredondar pra 2 casas fixas destruiria
 * o que a pessoa está no meio de escrever.
 */
export function normalizarNota(texto: string): string {
  const indiceVirgula = texto.indexOf(",");
  if (indiceVirgula === -1) return texto.replace(/^0+(?=\d)/, "");

  const parteInteira = texto.slice(0, indiceVirgula).replace(/^0+(?=\d)/, "");
  const parteDecimal = texto
    .slice(indiceVirgula + 1)
    .replace(/\D/g, "")
    .slice(0, 2);
  return `${parteInteira},${parteDecimal}`;
}

/**
 * Monta as entradas do solver de mínimos para uma frente: só conta como
 * "preenchido" o que o USUÁRIO digitou. Campo vazio e campo preenchido por
 * uma simulação anterior entram como `null` — ou seja, ficam reabertos para
 * o solver recalcular.
 *
 * Isto mora aqui, e não duplicado em cada consumidor, porque essa regra já
 * divergiu uma vez entre a tela e o cartão: a tela simulava com uma noção de
 * "preenchido" e o cartão calculava a dica com outra.
 */
export function entradasDoSolver(
  materia: Materia,
  frenteId: string,
  termo: string,
  simulados: Record<string, boolean>,
  saep: string,
  digitadoAgora?: CampoDigitado
): Record<string, Decimal | null> {
  const notas = materia.frentes.find((frente) => frente.id === frenteId)?.notas[termo];
  // A SAEP só existe digitada — nunca é simulada —, então não tem chave em `simulados`.
  const entradas: Record<string, Decimal | null> = { saep: saep.trim() ? paraDecimal(saep) : null };
  for (const componente of COMPONENTES) {
    // O valor recém-digitado ainda não chegou na store quando quem chama
    // precisa resimular — vale mais que o que está em `materia`, e conta
    // como digitado pelo usuário mesmo que o campo fosse simulado antes.
    if (digitadoAgora?.componente === componente) {
      entradas[componente] = digitadoAgora.valor.trim() ? paraDecimal(digitadoAgora.valor) : null;
      continue;
    }
    const valor = notas?.[componente];
    const chave = chaveSimulado(materia.id, termo, frenteId, componente);
    entradas[componente] = !valor || simulados[chave] ? null : paraDecimal(valor);
  }
  return entradas;
}

/**
 * Entradas para o solver do trimestre (o que preenche campos na tela): a SAEP
 * em aberto entra como 0, e não como campo a resolver. Como a simulação
 * nunca escreve a SAEP, deixá-la em aberto faria o solver contar com uma nota
 * que não aparece em lugar nenhum — e AT/Objetiva/Tarefa sairiam baixas demais.
 */
export function comSaepFixa(entradas: Record<string, Decimal | null>): Record<string, Decimal | null> {
  return { ...entradas, saep: entradas.saep ?? new Decimal(0) };
}

/** Campo que o usuário acabou de digitar, ainda não refletido na store. */
export interface CampoDigitado {
  componente: keyof NotasFrente;
  valor: string;
}

/**
 * Se algum campo desta frente, neste termo, foi preenchido por simulação.
 * `exceto` tira da conta o campo que o usuário acabou de digitar: ele deixa
 * de ser simulado no mesmo instante, mas a store ainda não sabe disso.
 */
export function frenteTemSimulado(
  materia: Materia,
  frenteId: string,
  termo: string,
  simulados: Record<string, boolean>,
  exceto?: keyof NotasFrente
): boolean {
  return COMPONENTES.some(
    (componente) =>
      componente !== exceto && simulados[chaveSimulado(materia.id, termo, frenteId, componente)]
  );
}
