import type { Avaliacao, AvaliacaoComNotas } from "../entities/avaliacao";

export interface AvaliacaoRepository {
  criar(avaliacao: Avaliacao): Promise<Avaliacao>;
  atualizar(avaliacao: Avaliacao): Promise<Avaliacao>;
  remover(id: string): Promise<void>;
  obterPorId(id: string): Promise<Avaliacao | null>;
  listarPorMateria(materiaId: string): Promise<Avaliacao[]>;
  listarPorPeriodo(periodoId: string): Promise<Avaliacao[]>;
  /**
   * Suporta a tela "Matéria" (docs/ARQUITETURA.md §9): lista de avaliações e
   * notas por período, já combinadas para evitar N+1 na camada de
   * apresentação.
   */
  listarComNotasPorMateriaEPeriodo(materiaId: string, periodoId: string): Promise<AvaliacaoComNotas[]>;
}
