import type { Rascunho } from "../entities/rascunho";

export interface RascunhoRepository {
  /** Upsert por `chave` — write-through com debounce (docs/ARQUITETURA.md §6). */
  salvar(rascunho: Rascunho): Promise<Rascunho>;
  obterPorChave(chave: string): Promise<Rascunho | null>;
  remover(chave: string): Promise<void>;
}
