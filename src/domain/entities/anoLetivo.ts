/**
 * Raiz de agregação do modelo de domínio. Ver docs/ARQUITETURA.md §5.
 * Permite guardar anos letivos anteriores (histórico) além do ano corrente.
 */
export interface AnoLetivo {
  id: string;
  rotulo: string;
  escola: string | null;
  serie: string | null;
  inicio: string;
  fim: string;
  formulaSpecId: string;
  ativo: boolean;
}
