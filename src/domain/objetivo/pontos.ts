import Decimal from "decimal.js";
import { arredondarNaEscala, mediaDaMateriaNoPeriodo } from "../formula/motorDeCalculo";
import { FormulaSpec } from "../formula/types";
import { FrenteComNotas, NotasDoTrimestre, PESOS_TRIMESTRE, PONTOS_OBJETIVO } from "./tipos";

/**
 * Quantos pontos a matéria já tem e quantos ainda cabem, na conta anual
 * (T1 + T2 + 2×T3, objetivo 24).
 *
 * Duas leituras do mesmo estado, e a diferença entre elas importa:
 *
 * - `garantidos`: campo em aberto conta como ZERO. É o piso — o que o aluno
 *   leva mesmo que zere tudo o que falta. É este o número que a tela mostra
 *   como "você tem", porque prometer pontos que dependem de prova futura
 *   seria mentir para quem está decidindo se pode relaxar.
 * - `maximoPossivel`: campo em aberto conta como nota máxima. Serve para
 *   dizer se o objetivo ainda é alcançável.
 */
export interface PontosDaMateria {
  /** Média da matéria em cada trimestre, com os campos em aberto como zero. */
  mediasPorTrimestre: Decimal[];
  /** Pontos já garantidos na soma ponderada. */
  garantidos: Decimal;
  /** Teto: pontos se tudo o que falta viesse com nota máxima. */
  maximoPossivel: Decimal;
  /** Quanto ainda falta para os 24 (nunca negativo). */
  falta: Decimal;
  /** O objetivo já foi batido com o que está lançado. */
  alcancado: boolean;
  /** Nem tirando o máximo em tudo o que falta dá para chegar aos 24. */
  inalcancavel: boolean;
}

/** Nota máxima do componente; cai na escala quando a spec não declara. */
export function notaMaximaDe(spec: FormulaSpec, componenteId: string): Decimal {
  const componente = spec.componentes.find((c) => c.id === componenteId);
  return new Decimal(componente?.notaMaxima ?? spec.escala.max);
}

/** Preenche os campos em aberto com um valor calculado a partir do componente. */
function materializar(
  spec: FormulaSpec,
  notas: NotasDoTrimestre,
  preencher: (componenteId: string) => Decimal
): Record<string, Decimal> {
  const contexto: Record<string, Decimal> = {};
  for (const componente of spec.componentes) {
    const lancada = notas[componente.id];
    contexto[componente.id] = lancada ?? preencher(componente.id);
  }
  return contexto;
}

/** Média da matéria num trimestre = média das frentes naquele trimestre. */
function mediaDaMateriaNoTrimestre(
  spec: FormulaSpec,
  frentes: FrenteComNotas[],
  trimestre: number,
  preencher: (componenteId: string) => Decimal
): Decimal {
  return mediaDaMateriaNoPeriodo(
    spec,
    frentes.map((frente) => materializar(spec, frente.notas[trimestre] ?? {}, preencher))
  );
}

function somarPonderado(medias: Decimal[]): Decimal {
  return medias.reduce(
    (total, media, indice) => total.plus(media.times(PESOS_TRIMESTRE[indice] ?? new Decimal(0))),
    new Decimal(0)
  );
}

export function calcularPontos(spec: FormulaSpec, frentes: FrenteComNotas[]): PontosDaMateria {
  const zero = () => new Decimal(0);
  const maximo = (componenteId: string) => notaMaximaDe(spec, componenteId);

  const mediasPorTrimestre = PESOS_TRIMESTRE.map((_, trimestre) =>
    mediaDaMateriaNoTrimestre(spec, frentes, trimestre, zero)
  );
  const mediasNoTeto = PESOS_TRIMESTRE.map((_, trimestre) =>
    mediaDaMateriaNoTrimestre(spec, frentes, trimestre, maximo)
  );

  // Arredondados na escala ANTES de virarem veredito: `alcancado`,
  // `inalcancavel` e `falta` precisam concordar com o número que a tela
  // mostra. Um total de 23,95 exibido como "24,0" e classificado como "não
  // alcançado" é a mesma matéria dando duas respostas ao mesmo tempo.
  const garantidos = arredondarNaEscala(somarPonderado(mediasPorTrimestre), spec.escala);
  const maximoPossivel = arredondarNaEscala(somarPonderado(mediasNoTeto), spec.escala);

  return {
    mediasPorTrimestre,
    garantidos,
    maximoPossivel,
    falta: Decimal.max(PONTOS_OBJETIVO.minus(garantidos), new Decimal(0)),
    alcancado: garantidos.gte(PONTOS_OBJETIVO),
    inalcancavel: maximoPossivel.lt(PONTOS_OBJETIVO),
  };
}
