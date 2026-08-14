import type { Nota } from "../entities/nota";

export interface NotaRepository {
  criar(nota: Nota): Promise<Nota>;
  atualizar(nota: Nota): Promise<Nota>;
  remover(id: string): Promise<void>;
  obterPorId(id: string): Promise<Nota | null>;
  listarPorAvaliacao(avaliacaoId: string): Promise<Nota[]>;
  listarPorAvaliacoes(avaliacaoIds: string[]): Promise<Nota[]>;
}
