import type { Frente } from "../../domain/entities/frente";
import type { frente } from "../local/db/schema";

type FrenteRow = typeof frente.$inferSelect;
type NovaFrenteRow = typeof frente.$inferInsert;

export function frenteRowParaDominio(row: FrenteRow): Frente {
  return {
    id: row.id,
    materiaId: row.materiaId,
    ordem: row.ordem,
    nome: row.nome,
  };
}

export function frenteDominioParaRow(entidade: Frente): NovaFrenteRow {
  return {
    id: entidade.id,
    materiaId: entidade.materiaId,
    ordem: entidade.ordem,
    nome: entidade.nome,
  };
}
