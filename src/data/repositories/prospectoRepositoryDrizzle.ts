import { eq } from "drizzle-orm";
import type { ProspectoRepository } from "../../domain/repositories/prospectoRepository";
import type { Prospecto } from "../../domain/entities/prospecto";
import type { AppDatabase } from "../local/db/client";
import { prospecto } from "../local/db/schema";
import { prospectoDominioParaRow, prospectoRowParaDominio } from "../mappers/prospectoMapper";

export class ProspectoRepositoryDrizzle implements ProspectoRepository {
  constructor(private readonly db: AppDatabase) {}

  async criar(entidade: Prospecto): Promise<Prospecto> {
    await this.db.insert(prospecto).values(prospectoDominioParaRow(entidade));
    return entidade;
  }

  async remover(id: string): Promise<void> {
    await this.db.delete(prospecto).where(eq(prospecto.id, id));
  }

  async obterPorId(id: string): Promise<Prospecto | null> {
    const linhas = await this.db.select().from(prospecto).where(eq(prospecto.id, id)).limit(1);
    return linhas[0] ? prospectoRowParaDominio(linhas[0]) : null;
  }

  async listarPorAnoLetivo(anoLetivoId: string): Promise<Prospecto[]> {
    const linhas = await this.db.select().from(prospecto).where(eq(prospecto.anoLetivoId, anoLetivoId));
    return linhas.map(prospectoRowParaDominio);
  }
}
