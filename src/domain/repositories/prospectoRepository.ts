import type { Prospecto } from "../entities/prospecto";

export interface ProspectoRepository {
  criar(prospecto: Prospecto): Promise<Prospecto>;
  remover(id: string): Promise<void>;
  obterPorId(id: string): Promise<Prospecto | null>;
  listarPorAnoLetivo(anoLetivoId: string): Promise<Prospecto[]>;
}
