import { eq } from "drizzle-orm";
import type { RascunhoRepository } from "../../domain/repositories/rascunhoRepository";
import type { Rascunho } from "../../domain/entities/rascunho";
import type { AppDatabase } from "../local/db/client";
import { rascunho } from "../local/db/schema";
import { rascunhoDominioParaRow, rascunhoRowParaDominio } from "../mappers/rascunhoMapper";

export class RascunhoRepositoryDrizzle implements RascunhoRepository {
  constructor(private readonly db: AppDatabase) {}

  /** Upsert por `chave` — write-through com debounce (docs/ARQUITETURA.md §6). */
  async salvar(entidade: Rascunho): Promise<Rascunho> {
    const linha = rascunhoDominioParaRow(entidade);
    await this.db
      .insert(rascunho)
      .values(linha)
      .onConflictDoUpdate({
        target: rascunho.chave,
        set: { payloadJson: linha.payloadJson, atualizadoEm: linha.atualizadoEm },
      });
    return entidade;
  }

  async obterPorChave(chave: string): Promise<Rascunho | null> {
    const linhas = await this.db.select().from(rascunho).where(eq(rascunho.chave, chave)).limit(1);
    return linhas[0] ? rascunhoRowParaDominio(linhas[0]) : null;
  }

  async remover(chave: string): Promise<void> {
    await this.db.delete(rascunho).where(eq(rascunho.chave, chave));
  }
}
