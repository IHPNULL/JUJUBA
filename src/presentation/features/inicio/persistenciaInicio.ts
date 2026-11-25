import { chaveSimulado, type Materia, type NotasFrente } from "../../store/inicioSlice";

/** Chave fixa do rascunho que guarda o estado inteiro da tela Início — ver docs/ARQUITETURA.md §6. */
export const CHAVE_RASCUNHO_INICIO = "inicio";

/** Subconjunto de `InicioState` que é persistido — `simulados` nunca é. */
export interface InicioState {
  termoSelecionado: string;
  meta: number;
  materias: Materia[];
  saep: Record<string, string>;
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
  saep: Record<string, string>;
}

export function serializarEstadoInicio(state: InicioState): string {
  const { termoSelecionado, meta, materias, saep, simulados } = state;
  return JSON.stringify({
    termoSelecionado,
    meta,
    materias: semNotasSimuladas(materias, simulados),
    saep,
  });
}

/**
 * Rascunho de antes da SAEP única guardava uma SAEP em cada frente. Na volta,
 * a primeira SAEP digitada de cada termo vira a SAEP do termo, e o campo sai
 * das frentes — senão ele ficaria no dado gravado para sempre, sem ninguém
 * que o leia.
 */
function migrarSaepDasFrentes(materias: Materia[]): { materias: Materia[]; saep: Record<string, string> } {
  const saep: Record<string, string> = {};
  const migradas = materias.map((materia) => ({
    ...materia,
    frentes: (materia.frentes ?? []).map((frente) => {
      const notas: Record<string, NotasFrente> = {};
      for (const [termo, notasDoTermo] of Object.entries(frente.notas ?? {})) {
        const { saep: saepAntiga, ...resto } = notasDoTermo as NotasFrente & { saep?: unknown };
        if (typeof saepAntiga === "string" && saepAntiga.trim() && !saep[termo]) saep[termo] = saepAntiga;
        notas[termo] = resto;
      }
      return { ...frente, notas };
    }),
  }));
  return { materias: migradas, saep };
}

function ehMapaDeTextos(valor: unknown): valor is Record<string, string> {
  return (
    typeof valor === "object" &&
    valor !== null &&
    !Array.isArray(valor) &&
    Object.values(valor).every((item) => typeof item === "string")
  );
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
  const { termoSelecionado, meta, materias, saep } = payload as Record<string, unknown>;

  if (typeof termoSelecionado !== "string") return null;
  if (typeof meta !== "number") return null;
  if (!Array.isArray(materias)) return null;

  const migrado = migrarSaepDasFrentes(materias as Materia[]);
  return {
    termoSelecionado,
    meta,
    materias: migrado.materias,
    // SAEP gravada no formato novo vence a migrada; termo sem nenhuma das duas fica vazio.
    saep: { ...migrado.saep, ...(ehMapaDeTextos(saep) ? saep : {}) },
  };
}
