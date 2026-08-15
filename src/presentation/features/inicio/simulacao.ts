import Decimal from "decimal.js";
import { chaveSimulado, Materia, NotasFrente } from "../../store/inicioSlice";

/** Ordem em que os componentes aparecem na UI e são enviados ao solver. */
export const COMPONENTES: (keyof NotasFrente)[] = ["at", "ao", "saep", "tarefa"];

export function paraDecimal(valor: string): Decimal {
  const limpo = valor.trim().replace(",", ".");
  if (limpo === "") return new Decimal(0);
  const numero = Number(limpo);
  return Number.isFinite(numero) ? new Decimal(numero) : new Decimal(0);
}

/**
 * Monta as entradas do solver de mínimos para uma frente: só conta como
 * "preenchido" o que o USUÁRIO digitou. Campo vazio e campo preenchido por
 * uma simulação anterior entram como `null` — ou seja, ficam reabertos para
 * o solver recalcular.
 *
 * Isto mora aqui, e não duplicado em cada consumidor, porque essa regra já
 * divergiu uma vez entre a tela e o cartão: a tela simulava com uma noção de
 * "preenchido" e o cartão calculava a dica com outra.
 */
export function entradasDoSolver(
  materia: Materia,
  frenteId: string,
  termo: string,
  simulados: Record<string, boolean>,
  digitadoAgora?: CampoDigitado
): Record<string, Decimal | null> {
  const notas = materia.frentes.find((frente) => frente.id === frenteId)?.notas[termo];
  const entradas: Record<string, Decimal | null> = {};
  for (const componente of COMPONENTES) {
    // O valor recém-digitado ainda não chegou na store quando quem chama
    // precisa resimular — vale mais que o que está em `materia`, e conta
    // como digitado pelo usuário mesmo que o campo fosse simulado antes.
    if (digitadoAgora?.componente === componente) {
      entradas[componente] = digitadoAgora.valor.trim() ? paraDecimal(digitadoAgora.valor) : null;
      continue;
    }
    const valor = notas?.[componente];
    const chave = chaveSimulado(materia.id, termo, frenteId, componente);
    entradas[componente] = !valor || simulados[chave] ? null : paraDecimal(valor);
  }
  return entradas;
}

/** Campo que o usuário acabou de digitar, ainda não refletido na store. */
export interface CampoDigitado {
  componente: keyof NotasFrente;
  valor: string;
}

/**
 * Se algum campo desta frente, neste termo, foi preenchido por simulação.
 * `exceto` tira da conta o campo que o usuário acabou de digitar: ele deixa
 * de ser simulado no mesmo instante, mas a store ainda não sabe disso.
 */
export function frenteTemSimulado(
  materia: Materia,
  frenteId: string,
  termo: string,
  simulados: Record<string, boolean>,
  exceto?: keyof NotasFrente
): boolean {
  return COMPONENTES.some(
    (componente) =>
      componente !== exceto && simulados[chaveSimulado(materia.id, termo, frenteId, componente)]
  );
}
