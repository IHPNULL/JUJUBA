import Decimal from "decimal.js";
import { avaliarExpressao } from "./avaliador";
import {
  Arredondamento,
  ContextoDeCalculo,
  Escala,
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
