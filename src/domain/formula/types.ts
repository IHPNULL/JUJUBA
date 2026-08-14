import Decimal from "decimal.js";

export type Arredondamento = "half_up" | "half_even" | "floor" | "ceil" | "truncate";

export interface Escala {
  min: number;
  max: number;
  casasDecimais: number;
  arredondamento: Arredondamento;
}

export interface ComponenteSpec {
  id: string;
  rotulo: string;
  peso: number;
  notaMaxima?: number;
  obrigatorio?: boolean;
  quantidadePorPeriodo?: number;
}

export interface FormulaSpec {
  schemaVersion: 1;
  id: string;
  versao: number;
  nome: string;
  descricao?: string;
  provisoria?: boolean;
  periodos: { tipo: string; quantidade: number; rotulos?: string[] };
  escala: Escala;
  componentes: ComponenteSpec[];
  calculos: {
    mediaPeriodo: string;
    mediaAnual?: string;
    mediaFinal: string;
    [outro: string]: string | undefined;
  };
  criterios: {
    aprovado: string;
    recuperacao?: string;
    reprovado?: string;
  };
  recuperacao?: { habilitada: boolean; escopo?: string; substituiMedia?: boolean };
  frequencia?: { considerada?: boolean; minima?: number };
  meta?: { notaParaAprovacao?: number; frequenciaMinima?: number; fonte?: string };
}

/** Valor que pode aparecer no contexto de avaliação de uma expressão. */
export type ValorContexto = Decimal | (Decimal | null)[] | boolean | null;

export type ContextoDeCalculo = Record<string, ValorContexto>;

export type Situacao = "aprovado" | "recuperacao" | "reprovado" | "indefinido";

export interface ResultadoCalculado {
  mediaPeriodo?: Decimal;
  mediaAnual?: Decimal;
  mediaFinal: Decimal;
  situacao: Situacao;
  formulaSpecId: string;
  formulaVersao: number;
}

export class FormulaError extends Error {}
