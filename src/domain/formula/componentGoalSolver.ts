import Decimal from "decimal.js";
import { avaliarPeriodo } from "./motorDeCalculo";
import { ComponenteSpec, Escala, FormulaError, FormulaSpec } from "./types";

/**
 * Solver de "quanto preciso tirar" no nível de COMPONENTE dentro de um
 * período (ex.: AT e Objetiva ainda não lançados nesta frente) — diferente
 * do `goalSolver.ts` (nível de período/ano, bisseção). Não modifica nem
 * reaproveita `goalSolver.ts`.
 *
 * Algoritmo: para cada componente vazio, sonda seu coeficiente na fórmula
 * avaliando `avaliarPeriodo` com o componente em 0 e no próprio máximo
 * (demais fixos) — `coef = (f(max) - f(0)) / max`. Isso mantém o solver
 * agnóstico à forma exata da expressão (mesmo princípio de "fórmula como
 * dado" do resto do motor), ao custo de assumir que a fórmula é
 * aproximadamente linear em cada componente dentro do intervalo sondado —
 * uma suposição segura aqui porque a única não-linearidade da fórmula real
 * é o teto `min(10, ...)`, e subestimar o coeficiente por causa do teto só
 * faz o solver pedir MAIS do que o estritamente necessário, nunca menos.
 *
 * Distribuição do déficit entre vazios: mesmo comportamento do
 * `minimumsFor` do mockup — todos os campos vazios recebem a MESMA fração
 * `x` do próprio valor máximo (não uma fração do déficit), onde `x` é
 * escolhido para que a soma pondera da pelos coeficientes feche o déficit
 * exatamente. Resultado sempre arredondado PARA CIMA na escala (nunca
 * sugerir um valor que, arredondado para baixo, ficaria abaixo da meta).
 */

export type ResultadoMinimosComponentes =
  | { tipo: "semVazios" }
  | { tipo: "jaAlcancado"; valores: Record<string, Decimal> }
  | { tipo: "valores"; valores: Record<string, Decimal> }
  | { tipo: "impossivel"; melhorPossivel: Decimal };

export function resolverMinimosComponentes(
  spec: FormulaSpec,
  preenchidos: Record<string, Decimal | null>,
  meta: Decimal
): ResultadoMinimosComponentes {
  const vazios = spec.componentes.filter(
    (componente) => preenchidos[componente.id] === null || preenchidos[componente.id] === undefined
  );

  if (vazios.length === 0) {
    return { tipo: "semVazios" };
  }

  const baseComVaziosEmZero = construirContexto(spec, preenchidos, vazios, () => new Decimal(0));
  const have = avaliarPeriodo(spec, baseComVaziosEmZero);

  const coeficientes = new Map<string, Decimal>();
  for (const vazio of vazios) {
    const notaMaxima = notaMaximaObrigatoria(vazio);
    const comMaximo = { ...baseComVaziosEmZero, [vazio.id]: notaMaxima };
    const valorComMaximo = avaliarPeriodo(spec, comMaximo);
    coeficientes.set(vazio.id, valorComMaximo.minus(have).div(notaMaxima));
  }

  const capacidade = vazios.reduce(
    (acumulado, componente) =>
      acumulado.plus(coeficientes.get(componente.id)!.times(notaMaximaObrigatoria(componente))),
    new Decimal(0)
  );

  const deficit = meta.minus(have);

  if (deficit.lte(0)) {
    const valores: Record<string, Decimal> = {};
    vazios.forEach((componente) => {
      valores[componente.id] = new Decimal(0);
    });
    return { tipo: "jaAlcancado", valores };
  }

  if (capacidade.lte(0) || deficit.gt(capacidade)) {
    const melhorPossivel = avaliarPeriodo(
      spec,
      construirContexto(spec, preenchidos, vazios, (componente) => notaMaximaObrigatoria(componente))
    );
    return { tipo: "impossivel", melhorPossivel };
  }

  const x = deficit.div(capacidade);
  const valores: Record<string, Decimal> = {};
  for (const vazio of vazios) {
    const notaMaxima = notaMaximaObrigatoria(vazio);
    const bruto = x.times(notaMaxima);
    const arredondadoParaCima = arredondarParaCimaNaEscala(bruto, spec.escala);
    valores[vazio.id] = Decimal.min(Decimal.max(arredondadoParaCima, new Decimal(0)), notaMaxima);
  }

  return ajustarAteVerificar(spec, preenchidos, vazios, valores, meta);
}

/**
 * `have`/`coeficientes`/`capacidade` são construídos a partir de
 * `avaliarPeriodo`, que SEMPRE arredonda (Task 2) — então o `x` calculado
 * acima é uma estimativa sobre valores já arredondados, não sobre a
 * aritmética exata. Isso pode, em tese, sugerir um valor que — depois de
 * recalculado pelo `avaliarPeriodo` real com os componentes preenchidos —
 * fica um pouquinho abaixo da meta. Em vez de confiar cegamente na
 * estimativa linear, verifica contra o avaliador de verdade (o mesmo
 * princípio do `goalSolver.ts`: nunca confiar no modelo, confiar no
 * resultado real) e sobe um passo de escala por vez, em todos os vazios
 * simultaneamente, até bater a meta de verdade ou esgotar o intervalo.
 */
function ajustarAteVerificar(
  spec: FormulaSpec,
  preenchidos: Record<string, Decimal | null>,
  vazios: ComponenteSpec[],
  valoresIniciais: Record<string, Decimal>,
  meta: Decimal
): ResultadoMinimosComponentes {
  const valores = { ...valoresIniciais };
  const passoDaEscala = new Decimal(10).pow(-spec.escala.casasDecimais);
  const MAX_TENTATIVAS = 50;

  for (let tentativa = 0; tentativa < MAX_TENTATIVAS; tentativa++) {
    const resultado = avaliarPeriodo(spec, construirContexto(spec, preenchidos, vazios, (c) => valores[c.id]));
    if (resultado.gte(meta)) {
      return { tipo: "valores", valores };
    }
    let algumSubiu = false;
    for (const vazio of vazios) {
      const notaMaxima = notaMaximaObrigatoria(vazio);
      if (valores[vazio.id].lt(notaMaxima)) {
        valores[vazio.id] = Decimal.min(valores[vazio.id].plus(passoDaEscala), notaMaxima);
        algumSubiu = true;
      }
    }
    if (!algumSubiu) break;
  }

  // Todos os vazios já no máximo (ou MAX_TENTATIVAS esgotado) e ainda não
  // basta — a estimativa linear divergiu demais do real. Reporta o melhor
  // resultado genuíno possível em vez de um valor "sugerido" que não entrega.
  const melhorPossivel = avaliarPeriodo(
    spec,
    construirContexto(spec, preenchidos, vazios, (componente) => notaMaximaObrigatoria(componente))
  );
  return { tipo: "impossivel", melhorPossivel };
}

function construirContexto(
  spec: FormulaSpec,
  preenchidos: Record<string, Decimal | null>,
  vazios: ComponenteSpec[],
  valorParaVazio: (componente: ComponenteSpec) => Decimal
): Record<string, Decimal> {
  const idsVazios = new Set(vazios.map((componente) => componente.id));
  const contexto: Record<string, Decimal> = {};
  for (const componente of spec.componentes) {
    contexto[componente.id] = idsVazios.has(componente.id)
      ? valorParaVazio(componente)
      : (preenchidos[componente.id] ?? new Decimal(0));
  }
  return contexto;
}

function notaMaximaObrigatoria(componente: ComponenteSpec): Decimal {
  if (componente.notaMaxima === undefined) {
    throw new FormulaError(`Componente "${componente.id}" precisa de notaMaxima para o solver de componentes`);
  }
  return new Decimal(componente.notaMaxima);
}

function arredondarParaCimaNaEscala(valor: Decimal, escala: Escala): Decimal {
  return valor.toDecimalPlaces(escala.casasDecimais, Decimal.ROUND_CEIL);
}
