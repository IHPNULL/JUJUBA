import { eq, inArray } from "drizzle-orm";
import type { NotaRepository } from "../../domain/repositories/notaRepository";
import type { Nota } from "../../domain/entities/nota";
import type { AppDatabase } from "../local/db/client";
import { nota } from "../local/db/schema";
import { notaDominioParaRow, notaRowParaDominio } from "../mappers/notaMapper";

export class NotaRepositoryDrizzle implements NotaRepository {
  constructor(private readonly db: AppDatabase) {}

  async criar(entidade: Nota): Promise<Nota> {
    await this.db.insert(nota).values(notaDominioParaRow(entidade));
    return entidade;
  }

  async atualizar(entidade: Nota): Promise<Nota> {
    await this.db.update(nota).set(notaDominioParaRow(entidade)).where(eq(nota.id, entidade.id));
    return entidade;
  }

  async remover(id: string): Promise<void> {
    await this.db.delete(nota).where(eq(nota.id, id));
  }

  async obterPorId(id: string): Promise<Nota | null> {
    const linhas = await this.db.select().from(nota).where(eq(nota.id, id)).limit(1);
    return linhas[0] ? notaRowParaDominio(linhas[0]) : null;
  }

  async listarPorAvaliacao(avaliacaoId: string): Promise<Nota[]> {
    const linhas = await this.db.select().from(nota).where(eq(nota.avaliacaoId, avaliacaoId));
    return linhas.map(notaRowParaDominio);
  }

  async listarPorAvaliacoes(avaliacaoIds: string[]): Promise<Nota[]> {
    if (avaliacaoIds.length === 0) {
      return [];
    }
    const linhas = await this.db.select().from(nota).where(inArray(nota.avaliacaoId, avaliacaoIds));
    return linhas.map(notaRowParaDominio);
  }
}
