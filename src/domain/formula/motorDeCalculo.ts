import Decimal from "decimal.js";
import { avaliarExpressao } from "./avaliador";
import {
  Arredondamento,
  ContextoDeCalculo,
  Escala,
  FormulaError,
  FormulaSpec,
  ResultadoCalculado,
  Situacao,
} from "./types";

const MODOS_ARREDONDAMENTO: Record<Arredondamento, Decimal.Rounding> = {
  half_up: Decimal.ROUND_HALF_UP,
  half_even: Decimal.ROUND_HALF_EVEN,
  floor: Decimal.ROUND_FLOOR,
  ceil: Decimal.ROUND_CEIL,
  truncate: Decimal.ROUND_DOWN,
};

/** Arredonda para a escala da FormulaSpec — nunca deixar isso a cargo do runtime. */
export function arredondarNaEscala(valor: Decimal, escala: Escala): Decimal {
  const modo = MODOS_ARREDONDAMENTO[escala.arredondamento];
  return valor.toDecimalPlaces(escala.casasDecimais, modo);
}

export interface EntradaAnual {
  /** Médias já calculadas por período, na ordem 1..N (ex.: P1..P4). */
  periodos: (Decimal | null)[];
  recuperacao: Decimal | null;
  frequencia: Decimal;
}

/**
 * Avalia mediaAnual, mediaFinal e a situação final do aluno para um ano
 * letivo, a partir das médias de período já calculadas.
 *
 * Ordem de verificação dos critérios: aprovado → recuperação → reprovado
 * (primeiro que for verdadeiro decide a situação). Essa ordem é a que reflete
 * o comportamento esperado nos goldens — uma recuperação que empurra a média
 * final acima do corte de aprovação deve resultar em "aprovado", não
 * "recuperacao"; ver specs/exemplo-media-bimestral.golden.json, caso
 * "recuperacao salva o aluno". O comentário em formula.schema.json descreve a
 * ordem "recuperacao, aprovado, reprovado" apenas como ordem de leitura do
 * schema, não como ordem de avaliação.
 */
export function avaliarAno(spec: FormulaSpec, entrada: EntradaAnual): ResultadoCalculado {
  const contexto: ContextoDeCalculo = {
    periodos: entrada.periodos,
    recuperacao: entrada.recuperacao,
    frequencia: entrada.frequencia,
  };
  entrada.periodos.forEach((valor, i) => {
    contexto[`P${i + 1}`] = valor;
  });

  let mediaAnual: Decimal | undefined;
  if (spec.calculos.mediaAnual) {
    mediaAnual = arredondarNaEscala(
      comoDecimalObrigatorio(avaliarExpressao(spec.calculos.mediaAnual, contexto), "mediaAnual"),
      spec.escala
    );
    contexto.mediaAnual = mediaAnual;
  }

  const mediaFinal = arredondarNaEscala(
    comoDecimalObrigatorio(avaliarExpressao(spec.calculos.mediaFinal, contexto), "mediaFinal"),
    spec.escala
  );
  contexto.mediaFinal = mediaFinal;

  const situacao = avaliarSituacao(spec, contexto);

  return { mediaAnual, mediaFinal, situacao, formulaSpecId: spec.id, formulaVersao: spec.versao };
}

function avaliarSituacao(spec: FormulaSpec, contexto: ContextoDeCalculo): Situacao {
  const ordem: { chave: keyof FormulaSpec["criterios"]; situacao: Situacao }[] = [
    { chave: "aprovado", situacao: "aprovado" },
    { chave: "recuperacao", situacao: "recuperacao" },
    { chave: "reprovado", situacao: "reprovado" },
  ];
  for (const { chave, situacao } of ordem) {
    const expressao = spec.criterios[chave];
    if (!expressao) continue;
    const resultado = avaliarExpressao(expressao, contexto);
    if (typeof resultado !== "boolean") {
      throw new Error(`Critério "${chave}" precisa avaliar para booleano`);
    }
    if (resultado) return situacao;
  }
  return "indefinido";
}

function comoDecimalObrigatorio(v: unknown, nome: string): Decimal {
  if (v instanceof Decimal) return v;
  throw new Error(`${nome} precisa avaliar para número, recebeu ${JSON.stringify(v)}`);
}

/**
 * Avalia `calculos.mediaPeriodo` para uma frente/período específico, a
 * partir dos componentes já digitados. `componentes` precisa ter uma
 * entrada `Decimal` para cada `spec.componentes[].id` — quem chama decide
 * como tratar um campo ainda não digitado (esta tela usa `Decimal(0)`,
 * espelhando o comportamento do mockup `Jujuba.dc.html`, onde um campo
 * vazio conta como zero na média ao vivo).
 */
export function avaliarPeriodo(spec: FormulaSpec, componentes: Record<string, Decimal>): Decimal {
  return arredondarNaEscala(avaliarPeriodoBruto(spec, componentes), spec.escala);
}

/**
 * Mesma conta de `avaliarPeriodo`, SEM arredondar. Existe para quem ainda vai
 * combinar este valor com outro antes de exibir — hoje, a média entre frentes.
 * Arredondar aqui e de novo depois arredonda duas vezes o mesmo número, e o
 * erro não é teórico: com duas frentes, duas médias de uma casa viram uma
 * média de meia casa (ex.: 5,9 e 6,0 → 5,95), que a tela exibe como "6,0" mas
 * compara como menor que 6. Ver `mediaDaMateriaNoPeriodo`.
 */
export function avaliarPeriodoBruto(
  spec: FormulaSpec,
  componentes: Record<string, Decimal>
): Decimal {
  const contexto: ContextoDeCalculo = { ...componentes };
  return comoDecimalObrigatorio(
    avaliarExpressao(spec.calculos.mediaPeriodo, contexto),
    "mediaPeriodo"
  );
}

/**
 * Média aritmética simples entre as médias de período das frentes de uma
 * matéria (uma matéria de frente única tem sempre length 1). Sem pesos —
 * cada frente conta igual, espelhando `subjectMedia` do mockup. Não
 * arredonda: quem exibe decide a precisão.
 */
export function mediaEntreFrentes(medias: Decimal[]): Decimal {
  if (medias.length === 0) {
    throw new FormulaError("mediaEntreFrentes: precisa de pelo menos uma frente");
  }
  const soma = medias.reduce((acumulado, media) => acumulado.plus(media), new Decimal(0));
  return soma.div(medias.length);
}

/**
 * Média da matéria num período: a média entre as frentes, arredondada UMA
 * única vez na escala da spec.
 *
 * Este é o número que a escola trata como "a nota da matéria no trimestre", e
 * por isso ele precisa cair na escala (uma casa decimal) — é ele que entra na
 * soma dos 24 pontos e nas comparações com a meta. Calcular a média sobre as
 * frentes JÁ arredondadas colocava o resultado entre dois passos da escala, e
 * aí o texto exibido e o veredito divergiam.
 *
 * `contextosPorFrente` traz, para cada frente, o valor de cada componente da
 * spec — mesma convenção de `avaliarPeriodo`. Matéria sem frente nenhuma vale
 * zero, em vez de estourar.
 */
export function mediaDaMateriaNoPeriodo(
  spec: FormulaSpec,
  contextosPorFrente: Record<string, Decimal>[]
): Decimal {
  if (contextosPorFrente.length === 0) return new Decimal(0);
  const brutas = contextosPorFrente.map((componentes) => avaliarPeriodoBruto(spec, componentes));
  return arredondarNaEscala(mediaEntreFrentes(brutas), spec.escala);
}
