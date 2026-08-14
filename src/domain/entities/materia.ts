/**
 * Ver docs/ARQUITETURA.md §5. Entrada obrigatória do usuário no onboarding.
 */
export interface Materia {
  id: string;
  anoLetivoId: string;
  nome: string;
  professor: string | null;
  cor: string | null;
  cargaHoraria: number | null;
  formulaSpecIdOverride: string | null;
  arquivada: boolean;
}
