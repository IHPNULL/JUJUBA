import type { Periodo } from "../entities/periodo";

export interface PeriodoRepository {
  criar(periodo: Periodo): Promise<Periodo>;
  atualizar(periodo: Periodo): Promise<Periodo>;
  remover(id: string): Promise<void>;
  obterPorId(id: string): Promise<Periodo | null>;
  /** Ordenado por `ordem` crescente. */
  listarPorAnoLetivo(anoLetivoId: string): Promise<Periodo[]>;
}
