import type { Materia } from "../../store/inicioSlice";

/** Chave fixa do rascunho que guarda o estado inteiro da tela Início — ver docs/ARQUITETURA.md §6. */
export const CHAVE_RASCUNHO_INICIO = "inicio";

/** Subconjunto de `InicioState` que é persistido — `simulados` nunca é. */
export interface InicioState {
  termoSelecionado: string;
  meta: number;
  materias: Materia[];
  simulados: Record<string, boolean>;
}

export interface EstadoInicioPersistido {
  termoSelecionado: string;
  meta: number;
  materias: Materia[];
}

export function serializarEstadoInicio(state: InicioState): string {
  const { termoSelecionado, meta, materias } = state;
  return JSON.stringify({ termoSelecionado, meta, materias });
}

/** Tolerante a dado corrompido/formato antigo: retorna `null` em vez de lançar. */
export function hidratarPayloadInicio(json: string): EstadoInicioPersistido | null {
  let payload: unknown;
  try {
    payload = JSON.parse(json);
  } catch {
    return null;
  }

  if (typeof payload !== "object" || payload === null) return null;
  const { termoSelecionado, meta, materias } = payload as Record<string, unknown>;

  if (typeof termoSelecionado !== "string") return null;
  if (typeof meta !== "number") return null;
  if (!Array.isArray(materias)) return null;

  return { termoSelecionado, meta, materias: materias as Materia[] };
}
