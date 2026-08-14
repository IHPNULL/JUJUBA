import type { Materia } from "../entities/materia";

export interface MateriaRepository {
  criar(materia: Materia): Promise<Materia>;
  atualizar(materia: Materia): Promise<Materia>;
  remover(id: string): Promise<void>;
  obterPorId(id: string): Promise<Materia | null>;
  /** Por padrão exclui matérias arquivadas, salvo `incluirArquivadas`. */
  listarPorAnoLetivo(anoLetivoId: string, opcoes?: { incluirArquivadas?: boolean }): Promise<Materia[]>;
  arquivar(id: string): Promise<void>;
}
