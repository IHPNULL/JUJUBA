import type { AnoLetivo } from "../../domain/entities/anoLetivo";
import type { anoLetivo } from "../local/db/schema";

type AnoLetivoRow = typeof anoLetivo.$inferSelect;
type NovoAnoLetivoRow = typeof anoLetivo.$inferInsert;

export function anoLetivoRowParaDominio(row: AnoLetivoRow): AnoLetivo {
  return {
    id: row.id,
    rotulo: row.rotulo,
    escola: row.escola,
    serie: row.serie,
    inicio: row.inicio,
    fim: row.fim,
    formulaSpecId: row.formulaSpecId,
    ativo: row.ativo,
  };
}

export function anoLetivoDominioParaRow(entidade: AnoLetivo): NovoAnoLetivoRow {
  return {
    id: entidade.id,
    rotulo: entidade.rotulo,
    escola: entidade.escola,
    serie: entidade.serie,
    inicio: entidade.inicio,
    fim: entidade.fim,
    formulaSpecId: entidade.formulaSpecId,
    ativo: entidade.ativo,
  };
}
