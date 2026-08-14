import type { AnoLetivo } from "../entities/anoLetivo";

export interface AnoLetivoRepository {
  criar(anoLetivo: AnoLetivo): Promise<AnoLetivo>;
  atualizar(anoLetivo: AnoLetivo): Promise<AnoLetivo>;
  remover(id: string): Promise<void>;
  obterPorId(id: string): Promise<AnoLetivo | null>;
  listarTodos(): Promise<AnoLetivo[]>;
  /** Único ano letivo com `ativo = true`, se houver. */
  obterAtivo(): Promise<AnoLetivo | null>;
}
