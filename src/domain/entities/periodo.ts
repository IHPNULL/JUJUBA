/**
 * Ver docs/ARQUITETURA.md §5. Quantidade e tipo de período vêm da `FormulaSpec`
 * associada ao `AnoLetivo`.
 */
export interface Periodo {
  id: string;
  anoLetivoId: string;
  ordem: number;
  nome: string;
  inicio: string | null;
  fim: string | null;
}
