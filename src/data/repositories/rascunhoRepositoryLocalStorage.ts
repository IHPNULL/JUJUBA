import type { RascunhoRepository } from "../../domain/repositories/rascunhoRepository";
import type { Rascunho } from "../../domain/entities/rascunho";

export interface ArmazenamentoChaveValor {
  getItem(chave: string): string | null;
  setItem(chave: string, valor: string): void;
  removeItem(chave: string): void;
}

const PREFIXO = "rascunho:";

/**
 * Alternativa a `RascunhoRepositoryDrizzle` para a build web: `expo-sqlite`
 * no navegador exige headers `Cross-Origin-Embedder-Policy`/`-Opener-Policy`
 * (usa `SharedArrayBuffer`) que hosts estáticos como GitHub Pages não
 * permitem configurar. `localStorage` cobre o mesmo contrato
 * (`RascunhoRepository`) sem essa exigência — ver `app/_layout.tsx`.
 */
export class RascunhoRepositoryLocalStorage implements RascunhoRepository {
  constructor(private readonly armazenamento: ArmazenamentoChaveValor) {}

  async salvar(entidade: Rascunho): Promise<Rascunho> {
    this.armazenamento.setItem(PREFIXO + entidade.chave, JSON.stringify(entidade));
    return entidade;
  }

  async obterPorChave(chave: string): Promise<Rascunho | null> {
    const bruto = this.armazenamento.getItem(PREFIXO + chave);
    return bruto ? (JSON.parse(bruto) as Rascunho) : null;
  }

  async remover(chave: string): Promise<void> {
    this.armazenamento.removeItem(PREFIXO + chave);
  }
}
