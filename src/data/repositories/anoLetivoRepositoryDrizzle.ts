import { eq } from "drizzle-orm";
import type { AnoLetivoRepository } from "../../domain/repositories/anoLetivoRepository";
import type { AnoLetivo } from "../../domain/entities/anoLetivo";
import type { AppDatabase } from "../local/db/client";
import { anoLetivo } from "../local/db/schema";
import { anoLetivoDominioParaRow, anoLetivoRowParaDominio } from "../mappers/anoLetivoMapper";

/**
 * Implementação concreta via Drizzle. `db` é injetado (nunca importado como
 * singleton do módulo) para que testes usem `createTestDatabase()`
 * (`better-sqlite3` em memória) e o app real use `createAppDatabase()`
 * (`expo-sqlite`) — ver `src/data/local/db/client.ts`.
 */
export class AnoLetivoRepositoryDrizzle implements AnoLetivoRepository {
  constructor(private readonly db: AppDatabase) {}

  async criar(entidade: AnoLetivo): Promise<AnoLetivo> {
    await this.db.insert(anoLetivo).values(anoLetivoDominioParaRow(entidade));
    return entidade;
  }

  async atualizar(entidade: AnoLetivo): Promise<AnoLetivo> {
    await this.db
      .update(anoLetivo)
      .set(anoLetivoDominioParaRow(entidade))
      .where(eq(anoLetivo.id, entidade.id));
    return entidade;
  }

  async remover(id: string): Promise<void> {
    await this.db.delete(anoLetivo).where(eq(anoLetivo.id, id));
  }

  async obterPorId(id: string): Promise<AnoLetivo | null> {
    const linhas = await this.db.select().from(anoLetivo).where(eq(anoLetivo.id, id)).limit(1);
    return linhas[0] ? anoLetivoRowParaDominio(linhas[0]) : null;
  }

  async listarTodos(): Promise<AnoLetivo[]> {
    const linhas = await this.db.select().from(anoLetivo);
    return linhas.map(anoLetivoRowParaDominio);
  }

  async obterAtivo(): Promise<AnoLetivo | null> {
    const linhas = await this.db.select().from(anoLetivo).where(eq(anoLetivo.ativo, true)).limit(1);
    return linhas[0] ? anoLetivoRowParaDominio(linhas[0]) : null;
  }
}
