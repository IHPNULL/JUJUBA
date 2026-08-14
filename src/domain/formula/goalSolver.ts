import Decimal from "decimal.js";
import { avaliarAno, EntradaAnual } from "./motorDeCalculo";
import { Escala, FormulaError, FormulaSpec, ResultadoCalculado } from "./types";

/**
 * GoalSolver — "quanto preciso tirar para passar?" (docs/MOTOR-DE-FORMULA.md §4).
 *
 * Não inverte a `FormulaSpec` algebricamente: fórmulas escolares reais têm
 * `se()`, `max()`, recuperação e descarte de menor nota, e nenhuma delas tem
 * inversa fechada. Em vez disso trata `avaliarAno` como caixa-preta f(x) e faz
 * bisseção numérica sobre o domínio [escala.min, escala.max] da variável-alvo,
 * confirmando por amostragem que f é monotônica não-decrescente antes de
 * confiar no resultado — sem essa confirmação, devolve "indeterminado" em vez
 * de arriscar um número errado.
 */

/** Variável-alvo cujo valor ainda não é conhecido. */
export type AlvoMeta = { tipo: "periodo"; indice: number } | { tipo: "recuperacao" };

export interface EntradaMeta {
  spec: FormulaSpec;
  /**
   * Médias de período já calculadas, na ordem 1..N. A posição `alvo.indice`
   * (quando `alvo.tipo === "periodo"`) é ignorada — o solver testa valores
   * candidatos nela. Todas as demais posições precisam estar preenchidas.
   */
  periodos: (Decimal | null)[];
  /** Nota de recuperação já conhecida, ou `null`. Ignorada quando `alvo.tipo === "recuperacao"`. */
  recuperacao: Decimal | null;
  frequencia: Decimal;
  alvo: AlvoMeta;
}

export type ResultadoMeta =
  /** Já está aprovado mesmo na pior hipótese (nota mínima da escala) para a variável-alvo. */
  | { tipo: "jaPassou"; mediaFinalNoPior: Decimal }
  /** Precisa tirar pelo menos `valor` na variável-alvo para aprovar. */
  | { tipo: "precisaDe"; valor: Decimal }
  /** Mesmo com a nota máxima da escala não é mais possível aprovar por média. */
  | { tipo: "naoEPossivel"; melhorMediaFinal: Decimal }
  /** f não é monotônica não-decrescente no domínio amostrado — não é seguro adivinhar. */
  | { tipo: "indeterminado"; motivo: string };

/** Quantidade de pontos amostrados (além dos dois extremos) para checar monotonicidade. */
const QUANTIDADE_AMOSTRAS = 32;

/**
 * Resolve "quanto preciso tirar para passar" para uma única variável-alvo
 * (um período ou a recuperação), mantendo as demais entradas fixas.
 */
export function resolverMeta(entrada: EntradaMeta): ResultadoMeta {
  validarEntrada(entrada);

  const escala = entrada.spec.escala;
  const min = new Decimal(escala.min);
  const max = new Decimal(escala.max);
  const f = construirFuncaoAlvo(entrada);

  const noMinimo = f(min);
  if (estaAprovado(noMinimo)) {
    return { tipo: "jaPassou", mediaFinalNoPior: noMinimo.mediaFinal };
  }

  const noMaximo = f(max);
  if (!estaAprovado(noMaximo)) {
    return { tipo: "naoEPossivel", melhorMediaFinal: noMaximo.mediaFinal };
  }

  const motivoNaoMonotonico = verificarMonotonicidade(f, min, max);
  if (motivoNaoMonotonico) {
    return { tipo: "indeterminado", motivo: motivoNaoMonotonico };
  }

  const valor = bisseccionar(f, min, max, escala);
  return { tipo: "precisaDe", valor };
}

function estaAprovado(resultado: ResultadoCalculado): boolean {
  return resultado.situacao === "aprovado";
}

function validarEntrada(entrada: EntradaMeta): void {
  const { spec, alvo, periodos } = entrada;
  const quantidade = spec.periodos.quantidade;
  if (periodos.length !== quantidade) {
    throw new FormulaError(`Esperava ${quantidade} períodos, recebeu ${periodos.length}`);
  }
  if (alvo.tipo === "periodo") {
    if (!Number.isInteger(alvo.indice) || alvo.indice < 0 || alvo.indice >= quantidade) {
      throw new FormulaError(`Índice de período fora do intervalo: ${alvo.indice}`);
    }
    periodos.forEach((valor, i) => {
      if (i !== alvo.indice && valor === null) {
        throw new FormulaError(
          `Período P${i + 1} precisa ser conhecido para resolver a meta em P${alvo.indice + 1}`
        );
      }
    });
  }
}

/** Constrói f(x) = avaliarAno com a variável-alvo fixada em x, demais entradas fixas. */
function construirFuncaoAlvo(entrada: EntradaMeta): (x: Decimal) => ResultadoCalculado {
  const { spec, alvo } = entrada;
  return (x: Decimal): ResultadoCalculado => {
    const periodos = [...entrada.periodos];
    let recuperacao = entrada.recuperacao;
    if (alvo.tipo === "periodo") {
      periodos[alvo.indice] = x;
    } else {
      recuperacao = x;
    }
    const entradaAno: EntradaAnual = { periodos, recuperacao, frequencia: entrada.frequencia };
    return avaliarAno(spec, entradaAno);
  };
}

/**
 * Amostra o domínio e confirma que mediaFinal é monotônica não-decrescente em
 * x — a pré-condição documentada em docs/MOTOR-DE-FORMULA.md §4. Sem ela a
 * bisseção pode convergir para um valor errado.
 */
function verificarMonotonicidade(
  f: (x: Decimal) => ResultadoCalculado,
  min: Decimal,
  max: Decimal
): string | null {
  const passo = max.minus(min).div(QUANTIDADE_AMOSTRAS);
  let anterior: Decimal | null = null;
  let xAnterior: Decimal | null = null;
  for (let i = 0; i <= QUANTIDADE_AMOSTRAS; i++) {
    const x = i === QUANTIDADE_AMOSTRAS ? max : min.plus(passo.times(i));
    const atual = f(x).mediaFinal;
    if (anterior !== null && xAnterior !== null && atual.lt(anterior)) {
      return (
        `mediaFinal não é monotônica não-decrescente no domínio [${min.toString()}, ${max.toString()}]: ` +
        `f(${xAnterior.toString()}) = ${anterior.toString()} > f(${x.toString()}) = ${atual.toString()}`
      );
    }
    anterior = atual;
    xAnterior = x;
  }
  return null;
}

/**
 * Bisseção sobre o predicado "aprovado". Ele é monotônico não-decrescente em
 * x porque mediaFinal já foi confirmada monotônica (verificarMonotonicidade)
 * e o critério de aprovação (mediaFinal >= corte && frequência >= mínima) é
 * monotônico em mediaFinal com frequência fixa nesta chamada.
 *
 * Invariante do laço: f(lo) não está aprovado, f(hi) está aprovado — verdade
 * de saída porque os chamadores já garantiram isso em min/max antes de chegar
 * aqui, e mantido em cada iteração.
 *
 * Depois de convergir dentro de 10^-(casasDecimais+1), arredonda `hi` PARA
 * CIMA na precisão da escala (nunca reportar 6,49 quando 6,5 é necessário) e
 * então "afina" o candidato: como a bisseção pode parar em qualquer ponto do
 * intervalo residual, o arredondamento para cima isolado poderia reportar um
 * valor um passo de escala acima do estritamente necessário quando a
 * fronteira real cai exatamente sobre um múltiplo da precisão da escala. Por
 * isso, decrementa o candidato um passo de escala por vez enquanto o passo
 * anterior ainda aprovar, garantindo o menor valor de escala que aprova.
 */
function bisseccionar(
  f: (x: Decimal) => ResultadoCalculado,
  min: Decimal,
  max: Decimal,
  escala: Escala
): Decimal {
  let lo = min;
  let hi = max;
  const epsilon = new Decimal(10).pow(-(escala.casasDecimais + 1));

  while (hi.minus(lo).gt(epsilon)) {
    const meio = lo.plus(hi).div(2);
    if (estaAprovado(f(meio))) {
      hi = meio;
    } else {
      lo = meio;
    }
  }

  const passoDaEscala = new Decimal(10).pow(-escala.casasDecimais);
  let candidato = hi.toDecimalPlaces(escala.casasDecimais, Decimal.ROUND_CEIL);
  while (candidato.minus(passoDaEscala).gte(min) && estaAprovado(f(candidato.minus(passoDaEscala)))) {
    candidato = candidato.minus(passoDaEscala);
  }
  return candidato;
}
