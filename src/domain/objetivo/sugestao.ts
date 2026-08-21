import Decimal from "decimal.js";
import { FormulaSpec } from "../formula/types";
import { calcularPontos, notaMaximaDe } from "./pontos";
import { CampoEmAberto, FrenteComNotas, PONTOS_OBJETIVO } from "./tipos";

/**
 * "Quanto preciso tirar em cada prova que falta para fechar os 24 pontos, com
 * o menor esforço possível?"
 *
 * Menor esforço aqui é uma definição, não uma intuição: **a mesma fração do
 * máximo em todo campo em aberto**. Pedir 60% de cada prova que falta é o que
 * minimiza a maior nota individual exigida — qualquer distribuição desigual
 * alivia um campo à custa de exigir mais de outro.
 *
 * A vantagem é que essa regra já embute as duas assimetrias da fórmula, sem
 * precisar tratá-las como caso especial: Tarefa rende 1 ponto de média por
 * ponto tirado (contra 0,5 da AT e 0,25 da Objetiva/SAEP) e o 3º trimestre
 * vale dobrado. Campos que rendem mais entram na conta com coeficiente maior
 * e, por isso, puxam o `x` necessário para baixo.
 *
 * O algoritmo é o mesmo do `componentGoalSolver`, um nível acima: sonda o
 * coeficiente de cada campo em aberto (avaliando com ele em 0 e no máximo),
 * estima o `x` linearmente e então **confere contra o cálculo real**, subindo
 * um passo de escala por vez enquanto não bater os 24. A estimativa linear
 * não é confiável sozinha porque a fórmula tem teto (`min(10, ...)`) e porque
 * cada avaliação já vem arredondada.
 */
export type ResultadoSugestao =
  | { tipo: "semCamposEmAberto" }
  | { tipo: "jaAlcancado" }
  | { tipo: "impossivel"; maximoPossivel: Decimal }
  | { tipo: "sugestao"; valores: Map<string, Decimal>; campos: CampoEmAberto[] };

/** Chave estável de um campo em aberto, para indexar a sugestão. */
export function chaveCampo(campo: CampoEmAberto): string {
  return `${campo.frenteId}|${campo.trimestre}|${campo.componente}`;
}

export function camposEmAberto(spec: FormulaSpec, frentes: FrenteComNotas[]): CampoEmAberto[] {
  const campos: CampoEmAberto[] = [];
  frentes.forEach((frente) => {
    frente.notas.forEach((notasDoTrimestre, trimestre) => {
      for (const componente of spec.componentes) {
        if (notasDoTrimestre[componente.id] == null) {
          campos.push({ frenteId: frente.id, trimestre, componente: componente.id });
        }
      }
    });
  });
  return campos;
}

/** Cópia das frentes com alguns campos em aberto preenchidos. */
function comValores(
  frentes: FrenteComNotas[],
  valores: Map<string, Decimal>
): FrenteComNotas[] {
  return frentes.map((frente) => ({
    id: frente.id,
    notas: frente.notas.map((notasDoTrimestre, trimestre) => {
      const copia = { ...notasDoTrimestre };
      for (const [componente, nota] of Object.entries(copia)) {
        if (nota != null) continue;
        const chave = chaveCampo({ frenteId: frente.id, trimestre, componente });
        const valor = valores.get(chave);
        if (valor) copia[componente] = valor;
      }
      return copia;
    }),
  }));
}

/**
 * Preenche os campos em aberto com zero, exceto um, que recebe o máximo — a
 * sonda usada para medir quanto aquele campo sozinho rende na conta anual.
 */
function pontosComApenas(
  spec: FormulaSpec,
  frentes: FrenteComNotas[],
  campos: CampoEmAberto[],
  destacado: CampoEmAberto | null
): Decimal {
  const valores = new Map<string, Decimal>();
  for (const campo of campos) {
    const valor =
      destacado && chaveCampo(campo) === chaveCampo(destacado)
        ? notaMaximaDe(spec, campo.componente)
        : new Decimal(0);
    valores.set(chaveCampo(campo), valor);
  }
  return calcularPontos(spec, comValores(frentes, valores)).garantidos;
}

export function sugerirMinimos(
  spec: FormulaSpec,
  frentes: FrenteComNotas[],
  objetivo: Decimal = PONTOS_OBJETIVO
): ResultadoSugestao {
  // "Já alcançado" vem antes de "não há campo em aberto": quem fechou os 24
  // com tudo lançado precisa ouvir que conseguiu, não que não há o que sugerir.
  const atual = calcularPontos(spec, frentes);
  if (atual.garantidos.gte(objetivo)) return { tipo: "jaAlcancado" };

  const campos = camposEmAberto(spec, frentes);
  if (campos.length === 0) return { tipo: "semCamposEmAberto" };

  if (atual.maximoPossivel.lt(objetivo)) {
    return { tipo: "impossivel", maximoPossivel: atual.maximoPossivel };
  }

  const base = pontosComApenas(spec, frentes, campos, null);

  let capacidade = new Decimal(0);
  const coeficientes = new Map<string, Decimal>();
  for (const campo of campos) {
    const rendimento = pontosComApenas(spec, frentes, campos, campo).minus(base);
    coeficientes.set(chaveCampo(campo), rendimento);
    capacidade = capacidade.plus(rendimento);
  }

  const deficit = objetivo.minus(base);
  if (capacidade.lte(0)) return { tipo: "impossivel", maximoPossivel: atual.maximoPossivel };

  const x = Decimal.min(deficit.div(capacidade), new Decimal(1));
  const valores = new Map<string, Decimal>();
  for (const campo of campos) {
    const maximo = notaMaximaDe(spec, campo.componente);
    const bruto = x.times(maximo).toDecimalPlaces(spec.escala.casasDecimais, Decimal.ROUND_CEIL);
    valores.set(chaveCampo(campo), Decimal.min(Decimal.max(bruto, new Decimal(0)), maximo));
  }

  return ajustarAteVerificar(spec, frentes, campos, valores, objetivo);
}

/**
 * Confere a estimativa contra o cálculo real e sobe um passo de escala por
 * vez, em todos os campos ao mesmo tempo, até bater o objetivo. Mesmo
 * princípio do `componentGoalSolver`: a estimativa linear orienta, o
 * avaliador real decide.
 */
function ajustarAteVerificar(
  spec: FormulaSpec,
  frentes: FrenteComNotas[],
  campos: CampoEmAberto[],
  valoresIniciais: Map<string, Decimal>,
  objetivo: Decimal
): ResultadoSugestao {
  const valores = new Map(valoresIniciais);
  const passo = new Decimal(10).pow(-spec.escala.casasDecimais);
  const MAX_TENTATIVAS = 200;

  for (let tentativa = 0; tentativa < MAX_TENTATIVAS; tentativa++) {
    if (calcularPontos(spec, comValores(frentes, valores)).garantidos.gte(objetivo)) {
      return { tipo: "sugestao", valores, campos };
    }

    let algumSubiu = false;
    for (const campo of campos) {
      const chave = chaveCampo(campo);
      const maximo = notaMaximaDe(spec, campo.componente);
      const atual = valores.get(chave)!;
      if (atual.lt(maximo)) {
        valores.set(chave, Decimal.min(atual.plus(passo), maximo));
        algumSubiu = true;
      }
    }
    if (!algumSubiu) break;
  }

  const noTeto = new Map<string, Decimal>();
  for (const campo of campos) {
    noTeto.set(chaveCampo(campo), notaMaximaDe(spec, campo.componente));
  }
  return {
    tipo: "impossivel",
    maximoPossivel: calcularPontos(spec, comValores(frentes, noTeto)).garantidos,
  };
}
