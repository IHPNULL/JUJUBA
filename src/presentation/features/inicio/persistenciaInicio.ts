import { chaveSimulado, type Materia, type NotasFrente } from "../../store/inicioSlice";

/** Chave fixa do rascunho que guarda o estado inteiro da tela Início — ver docs/ARQUITETURA.md §6. */
export const CHAVE_RASCUNHO_INICIO = "inicio";

/** Subconjunto de `InicioState` que é persistido — `simulados` nunca é. */
export interface InicioState {
  termoSelecionado: string;
  meta: number;
  materias: Materia[];
  simulados: Record<string, boolean>;
}

/**
 * Zera as notas que vieram de simulação, em todos os termos.
 *
 * Só nota digitada é rascunho: o que o solver sugeriu é resultado de um
 * toque em "Simular", refeito em qualquer sessão a partir do que foi
 * digitado. Salvar essas notas as tornaria indistinguíveis das reais na
 * volta — `simulados` não é persistido, então elas reabririam o app já
 * sem a marca de simulado, contando como nota de verdade na média e no
 * destaque de campo digitado.
 *
 * Varre todos os termos (e não só o selecionado, como `limparSimulados`):
 * o mapa guarda chave por termo e dá para simular em mais de um antes de
 * o rascunho ser salvo.
 */
function semNotasSimuladas(materias: Materia[], simulados: Record<string, boolean>): Materia[] {
  if (Object.keys(simulados).length === 0) return materias;

  return materias.map((materia) => ({
    ...materia,
    frentes: materia.frentes.map((frente) => {
      const notasPorTermo: Record<string, NotasFrente> = {};
      for (const [termo, notas] of Object.entries(frente.notas)) {
        const limpas = { ...notas };
        for (const componente of Object.keys(limpas) as (keyof NotasFrente)[]) {
          if (simulados[chaveSimulado(materia.id, termo, frente.id, componente)]) {
            limpas[componente] = "";
          }
        }
        notasPorTermo[termo] = limpas;
      }
      return { ...frente, notas: notasPorTermo };
    }),
  }));
}

export interface EstadoInicioPersistido {
  termoSelecionado: string;
  meta: number;
  materias: Materia[];
}

export function serializarEstadoInicio(state: InicioState): string {
  const { termoSelecionado, meta, materias, simulados } = state;
  return JSON.stringify({
    termoSelecionado,
    meta,
    materias: semNotasSimuladas(materias, simulados),
  });
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
