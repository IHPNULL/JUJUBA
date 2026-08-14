import Decimal from "decimal.js";
import { Escala } from "./types";
import { arredondarNaEscala } from "./motorDeCalculo";

/**
 * Arredonda uma média na escala da spec e formata para exibição (vírgula
 * decimal). Use esta função — nunca `valor.toNumber().toFixed(n)`, que
 * arredonda o float binário, não o decimal exato (ex.: 8.45 → "8,4" via
 * float vs. "8,5", o correto). Também garante que o mesmo valor arredondado
 * usado na exibição seja o usado em comparações (ex.: `.gte(meta)`), para
 * que o texto exibido e o resultado de aprovado/reprovado nunca divirjam.
 */
export function arredondarEFormatar(
  valor: Decimal,
  escala: Escala
): { arredondado: Decimal; texto: string } {
  const arredondado = arredondarNaEscala(valor, escala);
  return { arredondado, texto: arredondado.toFixed(escala.casasDecimais).replace(".", ",") };
}
