/**
 * Ver docs/ARQUITETURA.md §5 e §7. `caminhoRelativo` NUNCA é um caminho
 * absoluto — o container do app muda de UUID entre instalações/atualizações.
 * Resolvido com `FileSystem.documentDirectory` a cada uso pela camada de
 * dados (fora de escopo aqui: domínio não conhece `expo-file-system`).
 */
export interface Prospecto {
  id: string;
  anoLetivoId: string;
  titulo: string;
  caminhoRelativo: string;
  mimeType: string;
  tamanho: number;
  hash: string;
  importadoEm: string;
}
