/**
 * 1 ou 2 conjuntos de notas independentes dentro de uma matéria (ex.:
 * Física com "Frente 1"/"Frente 2"). Matérias de frente única têm
 * exatamente uma `Frente` (nome "Única"), criada junto com a matéria — ver
 * docs/superpowers/specs/2026-08-14-formula-real-e-ui.md.
 */
export interface Frente {
  id: string;
  materiaId: string;
  ordem: number;
  nome: string;
}
