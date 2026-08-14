import Decimal from "decimal.js";

export type OrigemNota = "real" | "simulada";

/**
 * Ver docs/ARQUITETURA.md §5. `valor` nunca `double`/`number` — ver
 * docs/TECNOLOGIAS.md §2. Armazenado como `valorMilis` (inteiro escalado,
 * ex.: 8.75 → 8750) em `src/data/local/db/schema.ts` e convertido para
 * `Decimal` apenas em `src/data/mappers`.
 *
 * `origem = simulada` alimenta o simulador sem sujar o histórico.
 */
export interface Nota {
  id: string;
  avaliacaoId: string;
  valor: Decimal;
  origem: OrigemNota;
  atualizadoEm: string;
}
