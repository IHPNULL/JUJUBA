import { eq } from "drizzle-orm";
import type { FrenteRepository } from "../../domain/repositories/frenteRepository";
import type { Frente } from "../../domain/entities/frente";
import type { AppDatabase } from "../local/db/client";
import { frente } from "../local/db/schema";
import { frenteDominioParaRow, frenteRowParaDominio } from "../mappers/frenteMapper";

export class FrenteRepositoryDrizzle implements FrenteRepository {
  constructor(private readonly db: AppDatabase) {}

  async criar(entidade: Frente): Promise<Frente> {
    await this.db.insert(frente).values(frenteDominioParaRow(entidade));
    return entidade;
  }

  async listarPorMateria(materiaId: string): Promise<Frente[]> {
    const linhas = await this.db.select().from(frente).where(eq(frente.materiaId, materiaId));
    return linhas.map(frenteRowParaDominio);
  }
}
