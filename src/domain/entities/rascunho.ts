/**
 * Ver docs/ARQUITETURA.md §5 e §6 (persistência write-through com debounce,
 * R3). Estado de formulário em edição, mais volátil que a entidade
 * definitiva; sobrevive ao app ser encerrado pelo SO antes do `blur`/submit.
 */
export interface Rascunho {
  chave: string;
  payloadJson: string;
  atualizadoEm: string;
}
