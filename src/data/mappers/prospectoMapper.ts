import type { Prospecto } from "../../domain/entities/prospecto";
import type { prospecto } from "../local/db/schema";

type ProspectoRow = typeof prospecto.$inferSelect;
type NovoProspectoRow = typeof prospecto.$inferInsert;

export function prospectoRowParaDominio(row: ProspectoRow): Prospecto {
  return {
    id: row.id,
    anoLetivoId: row.anoLetivoId,
    titulo: row.titulo,
    caminhoRelativo: row.caminhoRelativo,
    mimeType: row.mimeType,
    tamanho: row.tamanho,
    hash: row.hash,
    importadoEm: row.importadoEm,
  };
}

export function prospectoDominioParaRow(entidade: Prospecto): NovoProspectoRow {
  return {
    id: entidade.id,
    anoLetivoId: entidade.anoLetivoId,
    titulo: entidade.titulo,
    caminhoRelativo: entidade.caminhoRelativo,
    mimeType: entidade.mimeType,
    tamanho: entidade.tamanho,
    hash: entidade.hash,
    importadoEm: entidade.importadoEm,
  };
}
