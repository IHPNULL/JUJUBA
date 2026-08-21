import Decimal from "decimal.js";

/**
 * Objetivo anual do aluno: somar 24 pontos até o fim do ano, sendo que o
 * último trimestre vale dobrado (T1 + T2 + 2×T3 ≥ 24).
 *
 * O total é por MATÉRIA. Matéria com mais de uma frente usa a média das
 * frentes como nota do trimestre, igual ao resto do app.
 *
 * Vale notar que 24 pontos em 4 unidades de peso é exatamente média
 * ponderada 6 — o mesmo corte de aprovação do critério da spec. Os 24 pontos
 * são a forma como a escola comunica a regra, não uma regra nova.
 */
export const PONTOS_OBJETIVO = new Decimal(24);

/** Peso de cada trimestre na soma anual: o terceiro vale dobrado. */
export const PESOS_TRIMESTRE = [1, 1, 2].map((p) => new Decimal(p));

/** Nota lançada, ou `null` quando o campo ainda está em aberto. */
export type NotasDoTrimestre = Record<string, Decimal | null>;

/**
 * Uma frente e suas notas por trimestre, indexadas pela posição do trimestre
 * (0, 1, 2). O domínio não conhece os rótulos da UI ("1º Tri") de propósito:
 * quem chama traduz.
 */
export interface FrenteComNotas {
  id: string;
  notas: NotasDoTrimestre[];
}

/** Um campo em aberto, endereçado de forma única dentro da matéria. */
export interface CampoEmAberto {
  frenteId: string;
  trimestre: number;
  componente: string;
}
