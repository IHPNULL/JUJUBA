import Decimal from "decimal.js";
import type { Nota } from "../../domain/entities/nota";
import type { nota } from "../local/db/schema";

type NotaRow = typeof nota.$inferSelect;
type NovaNotaRow = typeof nota.$inferInsert;

const ESCALA_MILIS = 1000;

/**
 * Única fronteira onde `valorMilis` (inteiro escalado, DB) vira `Decimal`
 * (domínio) — ver docs/TECNOLOGIAS.md §2 e ADR 0004. Nenhum outro ponto do
 * código deve fazer essa conversão.
 */
export function notaRowParaDominio(row: NotaRow): Nota {
  return {
    id: row.id,
    avaliacaoId: row.avaliacaoId,
    valor: new Decimal(row.valorMilis).div(ESCALA_MILIS),
    origem: row.origem,
    atualizadoEm: row.atualizadoEm,
  };
}

export function notaDominioParaRow(entidade: Nota): NovaNotaRow {
  return {
    id: entidade.id,
    avaliacaoId: entidade.avaliacaoId,
    valorMilis: entidade.valor.mul(ESCALA_MILIS).toDecimalPlaces(0).toNumber(),
    origem: entidade.origem,
    atualizadoEm: entidade.atualizadoEm,
  };
}
