import Decimal from "decimal.js";
import type { Nota } from "./nota";

/**
 * Ver docs/ARQUITETURA.md §5. Os *tipos* e *pesos* padrão vêm da `FormulaSpec`.
 *
 * `notaMaxima` é um valor de nota (ex.: prova vale 10) e por isso segue a
 * mesma regra de docs/TECNOLOGIAS.md §2: nunca `number` de ponto flutuante no
 * domínio. É armazenado como `notaMaximaMilis` (inteiro escalado) em
 * `src/data/local/db/schema.ts` e convertido para `Decimal` apenas em
 * `src/data/mappers`.
 */
export interface Avaliacao {
  id: string;
  materiaId: string;
  periodoId: string;
  titulo: string;
  tipoId: string;
  peso: number;
  notaMaxima: Decimal;
  data: string | null;
  obrigatoria: boolean;
}

/**
 * Agregado de leitura usado pela tela "Matéria" (docs/ARQUITETURA.md §9:
 * "Lista de avaliações e notas por período"). Uma `Avaliacao` pode ter zero
 * ou mais `Nota` (ex.: uma nota `real` e uma `simulada` coexistindo).
 */
export interface AvaliacaoComNotas {
  avaliacao: Avaliacao;
  notas: Nota[];
}
