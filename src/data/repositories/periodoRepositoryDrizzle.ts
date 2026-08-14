import { asc, eq } from "drizzle-orm";
import type { PeriodoRepository } from "../../domain/repositories/periodoRepository";
import type { Periodo } from "../../domain/entities/periodo";
import type { AppDatabase } from "../local/db/client";
import { periodo } from "../local/db/schema";
import { periodoDominioParaRow, periodoRowParaDominio } from "../mappers/periodoMapper";

export class PeriodoRepositoryDrizzle implements PeriodoRepository {
  constructor(private readonly db: AppDatabase) {}

  async criar(entidade: Periodo): Promise<Periodo> {
    await this.db.insert(periodo).values(periodoDominioParaRow(entidade));
    return entidade;
  }

  async atualizar(entidade: Periodo): Promise<Periodo> {
    await this.db.update(periodo).set(periodoDominioParaRow(entidade)).where(eq(periodo.id, entidade.id));
    return entidade;
  }

  async remover(id: string): Promise<void> {
    await this.db.delete(periodo).where(eq(periodo.id, id));
  }

  async obterPorId(id: string): Promise<Periodo | null> {
    const linhas = await this.db.select().from(periodo).where(eq(periodo.id, id)).limit(1);
    return linhas[0] ? periodoRowParaDominio(linhas[0]) : null;
  }

  async listarPorAnoLetivo(anoLetivoId: string): Promise<Periodo[]> {
    const linhas = await this.db
      .select()
      .from(periodo)
      .where(eq(periodo.anoLetivoId, anoLetivoId))
      .orderBy(asc(periodo.ordem));
    return linhas.map(periodoRowParaDominio);
  }
}
