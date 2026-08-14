import type { Materia } from "../../domain/entities/materia";
import type { materia } from "../local/db/schema";

type MateriaRow = typeof materia.$inferSelect;
type NovaMateriaRow = typeof materia.$inferInsert;

export function materiaRowParaDominio(row: MateriaRow): Materia {
  return {
    id: row.id,
    anoLetivoId: row.anoLetivoId,
    nome: row.nome,
    professor: row.professor,
    cor: row.cor,
    cargaHoraria: row.cargaHoraria,
    formulaSpecIdOverride: row.formulaSpecIdOverride,
    arquivada: row.arquivada,
  };
}

export function materiaDominioParaRow(entidade: Materia): NovaMateriaRow {
  return {
    id: entidade.id,
    anoLetivoId: entidade.anoLetivoId,
    nome: entidade.nome,
    professor: entidade.professor,
    cor: entidade.cor,
    cargaHoraria: entidade.cargaHoraria,
    formulaSpecIdOverride: entidade.formulaSpecIdOverride,
    arquivada: entidade.arquivada,
  };
}
