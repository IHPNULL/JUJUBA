import Decimal from "decimal.js";
import { FormulaError, ValorContexto } from "./types";

/**
 * Funções permitidas dentro de uma FormulaSpec. Nada fora desta lista é
 * aceito pelo avaliador — ver docs/MOTOR-DE-FORMULA.md §3.
 */

function comoDecimal(v: ValorContexto, nomeFuncao: string): Decimal {
  if (v instanceof Decimal) return v;
  throw new FormulaError(`${nomeFuncao}: esperava número, recebeu ${JSON.stringify(v)}`);
}

function comoArray(v: ValorContexto, nomeFuncao: string): (Decimal | null)[] {
  if (Array.isArray(v)) return v as (Decimal | null)[];
  throw new FormulaError(`${nomeFuncao}: esperava lista, recebeu ${JSON.stringify(v)}`);
}

function valoresPreenchidos(xs: (Decimal | null)[]): Decimal[] {
  return xs.filter((x): x is Decimal => x !== null);
}

export const whitelist: Record<string, (args: ValorContexto[]) => ValorContexto> = {
  min: (args) => {
    const ds = args.map((a) => comoDecimal(a, "min"));
    return ds.reduce((acc, d) => (d.lt(acc) ? d : acc));
  },
  max: (args) => {
    const ds = args.map((a) => comoDecimal(a, "max"));
    return ds.reduce((acc, d) => (d.gt(acc) ? d : acc));
  },
  abs: ([a]) => comoDecimal(a, "abs").abs(),
  round: ([a]) => comoDecimal(a, "round").toDecimalPlaces(0, Decimal.ROUND_HALF_UP),
  floor: ([a]) => comoDecimal(a, "floor").floor(),
  ceil: ([a]) => comoDecimal(a, "ceil").ceil(),
  media: ([a]) => {
    const preenchidos = valoresPreenchidos(comoArray(a, "media"));
    if (preenchidos.length === 0) throw new FormulaError("media: nenhum valor preenchido");
    const soma = preenchidos.reduce((acc, d) => acc.plus(d), new Decimal(0));
    return soma.div(preenchidos.length);
  },
  soma: ([a]) => {
    const preenchidos = valoresPreenchidos(comoArray(a, "soma"));
    return preenchidos.reduce((acc, d) => acc.plus(d), new Decimal(0));
  },
  contar: ([a]) => new Decimal(valoresPreenchidos(comoArray(a, "contar")).length),
  maiorN: ([a, n]) => {
    const preenchidos = valoresPreenchidos(comoArray(a, "maiorN"));
    const qtd = comoDecimal(n, "maiorN").toNumber();
    return [...preenchidos].sort((x, y) => y.cmp(x)).slice(0, qtd);
  },
  menorN: ([a, n]) => {
    const preenchidos = valoresPreenchidos(comoArray(a, "menorN"));
    const qtd = comoDecimal(n, "menorN").toNumber();
    return [...preenchidos].sort((x, y) => x.cmp(y)).slice(0, qtd);
  },
  descartarMenor: ([a]) => {
    const preenchidos = valoresPreenchidos(comoArray(a, "descartarMenor"));
    if (preenchidos.length === 0) return [];
    const menor = preenchidos.reduce((acc, d) => (d.lt(acc) ? d : acc));
    const idx = preenchidos.findIndex((d) => d.eq(menor));
    return preenchidos.filter((_, i) => i !== idx);
  },
  // somaPonderada e somaPesos operam sobre `componentes`: uma lista de
  // { valor: Decimal | null, peso: Decimal } fornecida pelo contexto de período.
  somaPonderada: ([componentes]) => {
    const lista = componentes as unknown as { valor: Decimal | null; peso: Decimal }[];
    return lista
      .filter((c) => c.valor !== null)
      .reduce((acc, c) => acc.plus(c.valor!.times(c.peso)), new Decimal(0));
  },
  somaPesos: ([componentes]) => {
    const lista = componentes as unknown as { valor: Decimal | null; peso: Decimal }[];
    return lista
      .filter((c) => c.valor !== null)
      .reduce((acc, c) => acc.plus(c.peso), new Decimal(0));
  },
};

export const NOMES_WHITELIST = Object.keys(whitelist);
