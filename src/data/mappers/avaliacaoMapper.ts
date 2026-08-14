import Decimal from "decimal.js";
import type { Avaliacao } from "../../domain/entities/avaliacao";
import type { avaliacao } from "../local/db/schema";

type AvaliacaoRow = typeof avaliacao.$inferSelect;
type NovaAvaliacaoRow = typeof avaliacao.$inferInsert;

const ESCALA_MILIS = 1000;

/**
 * Única fronteira onde `notaMaximaMilis` (inteiro escalado, DB) vira
 * `Decimal` (domínio) — ver docs/TECNOLOGIAS.md §2 e ADR 0004.
 */
export function avaliacaoRowParaDominio(row: AvaliacaoRow): Avaliacao {
  return {
    id: row.id,
    materiaId: row.materiaId,
    frenteId: row.frenteId,
    periodoId: row.periodoId,
    titulo: row.titulo,
    tipoId: row.tipoId,
    peso: row.peso,
    notaMaxima: new Decimal(row.notaMaximaMilis).div(ESCALA_MILIS),
    data: row.data,
    obrigatoria: row.obrigatoria,
  };
}

export function avaliacaoDominioParaRow(entidade: Avaliacao): NovaAvaliacaoRow {
  return {
    id: entidade.id,
    materiaId: entidade.materiaId,
    frenteId: entidade.frenteId,
    periodoId: entidade.periodoId,
    titulo: entidade.titulo,
    tipoId: entidade.tipoId,
    peso: entidade.peso,
    notaMaximaMilis: entidade.notaMaxima.mul(ESCALA_MILIS).toDecimalPlaces(0).toNumber(),
    data: entidade.data,
    obrigatoria: entidade.obrigatoria,
  };
}
