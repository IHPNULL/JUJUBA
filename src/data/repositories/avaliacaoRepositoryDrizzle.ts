import { and, eq, inArray } from "drizzle-orm";
import type { AvaliacaoRepository } from "../../domain/repositories/avaliacaoRepository";
import type { Avaliacao, AvaliacaoComNotas } from "../../domain/entities/avaliacao";
import type { AppDatabase } from "../local/db/client";
import { avaliacao, nota } from "../local/db/schema";
import { avaliacaoDominioParaRow, avaliacaoRowParaDominio } from "../mappers/avaliacaoMapper";
import { notaRowParaDominio } from "../mappers/notaMapper";

export class AvaliacaoRepositoryDrizzle implements AvaliacaoRepository {
  constructor(private readonly db: AppDatabase) {}

  async criar(entidade: Avaliacao): Promise<Avaliacao> {
    await this.db.insert(avaliacao).values(avaliacaoDominioParaRow(entidade));
    return entidade;
  }

  async atualizar(entidade: Avaliacao): Promise<Avaliacao> {
    await this.db
      .update(avaliacao)
      .set(avaliacaoDominioParaRow(entidade))
      .where(eq(avaliacao.id, entidade.id));
    return entidade;
  }

  async remover(id: string): Promise<void> {
    await this.db.delete(avaliacao).where(eq(avaliacao.id, id));
  }

  async obterPorId(id: string): Promise<Avaliacao | null> {
    const linhas = await this.db.select().from(avaliacao).where(eq(avaliacao.id, id)).limit(1);
    return linhas[0] ? avaliacaoRowParaDominio(linhas[0]) : null;
  }

  async listarPorMateria(materiaId: string): Promise<Avaliacao[]> {
    const linhas = await this.db.select().from(avaliacao).where(eq(avaliacao.materiaId, materiaId));
    return linhas.map(avaliacaoRowParaDominio);
  }

  async listarPorPeriodo(periodoId: string): Promise<Avaliacao[]> {
    const linhas = await this.db.select().from(avaliacao).where(eq(avaliacao.periodoId, periodoId));
    return linhas.map(avaliacaoRowParaDominio);
  }

  async listarComNotasPorMateriaEPeriodo(
    materiaId: string,
    periodoId: string,
  ): Promise<AvaliacaoComNotas[]> {
    const linhasAvaliacao = await this.db
      .select()
      .from(avaliacao)
      .where(and(eq(avaliacao.materiaId, materiaId), eq(avaliacao.periodoId, periodoId)));

    if (linhasAvaliacao.length === 0) {
      return [];
    }

    const avaliacaoIds = linhasAvaliacao.map((linha) => linha.id);
    const linhasNota = await this.db.select().from(nota).where(inArray(nota.avaliacaoId, avaliacaoIds));

    const notasPorAvaliacaoId = new Map<string, ReturnType<typeof notaRowParaDominio>[]>();
    for (const linhaNota of linhasNota) {
      const notas = notasPorAvaliacaoId.get(linhaNota.avaliacaoId) ?? [];
      notas.push(notaRowParaDominio(linhaNota));
      notasPorAvaliacaoId.set(linhaNota.avaliacaoId, notas);
    }

    return linhasAvaliacao.map((linhaAvaliacao) => ({
      avaliacao: avaliacaoRowParaDominio(linhaAvaliacao),
      notas: notasPorAvaliacaoId.get(linhaAvaliacao.id) ?? [],
    }));
  }
}
