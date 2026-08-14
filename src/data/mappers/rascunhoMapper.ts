import type { Rascunho } from "../../domain/entities/rascunho";
import type { rascunho } from "../local/db/schema";

type RascunhoRow = typeof rascunho.$inferSelect;
type NovoRascunhoRow = typeof rascunho.$inferInsert;

export function rascunhoRowParaDominio(row: RascunhoRow): Rascunho {
  return {
    chave: row.chave,
    payloadJson: row.payloadJson,
    atualizadoEm: row.atualizadoEm,
  };
}

export function rascunhoDominioParaRow(entidade: Rascunho): NovoRascunhoRow {
  return {
    chave: entidade.chave,
    payloadJson: entidade.payloadJson,
    atualizadoEm: entidade.atualizadoEm,
  };
}
