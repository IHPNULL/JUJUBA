import { and, eq } from "drizzle-orm";
import type { MateriaRepository } from "../../domain/repositories/materiaRepository";
import type { Materia } from "../../domain/entities/materia";
import type { AppDatabase } from "../local/db/client";
import { materia } from "../local/db/schema";
import { materiaDominioParaRow, materiaRowParaDominio } from "../mappers/materiaMapper";

export class MateriaRepositoryDrizzle implements MateriaRepository {
  constructor(private readonly db: AppDatabase) {}

  async criar(entidade: Materia): Promise<Materia> {
    await this.db.insert(materia).values(materiaDominioParaRow(entidade));
    return entidade;
  }

  async atualizar(entidade: Materia): Promise<Materia> {
    await this.db.update(materia).set(materiaDominioParaRow(entidade)).where(eq(materia.id, entidade.id));
    return entidade;
  }

  async remover(id: string): Promise<void> {
    await this.db.delete(materia).where(eq(materia.id, id));
  }

  async obterPorId(id: string): Promise<Materia | null> {
    const linhas = await this.db.select().from(materia).where(eq(materia.id, id)).limit(1);
    return linhas[0] ? materiaRowParaDominio(linhas[0]) : null;
  }

  async listarPorAnoLetivo(
    anoLetivoId: string,
    opcoes?: { incluirArquivadas?: boolean },
  ): Promise<Materia[]> {
    const condicao = opcoes?.incluirArquivadas
      ? eq(materia.anoLetivoId, anoLetivoId)
      : and(eq(materia.anoLetivoId, anoLetivoId), eq(materia.arquivada, false));
    const linhas = await this.db.select().from(materia).where(condicao);
    return linhas.map(materiaRowParaDominio);
  }

  async arquivar(id: string): Promise<void> {
    await this.db.update(materia).set({ arquivada: true }).where(eq(materia.id, id));
  }
}
