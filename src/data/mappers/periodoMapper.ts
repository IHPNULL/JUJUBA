import type { Periodo } from "../../domain/entities/periodo";
import type { periodo } from "../local/db/schema";

type PeriodoRow = typeof periodo.$inferSelect;
type NovoPeriodoRow = typeof periodo.$inferInsert;

export function periodoRowParaDominio(row: PeriodoRow): Periodo {
  return {
    id: row.id,
    anoLetivoId: row.anoLetivoId,
    ordem: row.ordem,
    nome: row.nome,
    inicio: row.inicio,
    fim: row.fim,
  };
}

export function periodoDominioParaRow(entidade: Periodo): NovoPeriodoRow {
  return {
    id: entidade.id,
    anoLetivoId: entidade.anoLetivoId,
    ordem: entidade.ordem,
    nome: entidade.nome,
    inicio: entidade.inicio,
    fim: entidade.fim,
  };
}
