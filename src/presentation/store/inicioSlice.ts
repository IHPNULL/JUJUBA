import { createSlice, nanoid, PayloadAction } from "@reduxjs/toolkit";
import type { CorMateria } from "../shared/theme";

export const TERMOS = ["1º Tri", "2º Tri", "3º Tri"];

export interface NotasFrente {
  at: string;
  ao: string;
  saep: string;
  tarefa: string;
}

export interface Frente {
  id: string;
  nome: string;
  /** `notas[termo]` — componentes digitados nesse termo (string, aceita vírgula; vazio = não digitado). */
  notas: Record<string, NotasFrente>;
}

export interface Materia {
  id: string;
  nome: string;
  cor: CorMateria;
  frentes: Frente[];
}

interface InicioState {
  termoSelecionado: string;
  meta: number;
  materias: Materia[];
  /** Chaves `"materiaId|termo|frenteId|componente"` simuladas nesta sessão — nunca persistidas. */
  simulados: Record<string, boolean>;
}

const notasVazias = (): NotasFrente => ({ at: "", ao: "", saep: "", tarefa: "" });

const initialState: InicioState = {
  termoSelecionado: TERMOS[0],
  meta: 7,
  materias: [],
  simulados: {},
};

export function chaveSimulado(materiaId: string, termo: string, frenteId: string, componente: string): string {
  return `${materiaId}|${termo}|${frenteId}|${componente}`;
}

/** Meta válida: sempre dentro da escala. Exportada porque a tela precisa do
 *  MESMO valor que o reducer vai guardar para já resimular com ele. */
export function limitarMeta(meta: number): number {
  return Math.max(0, Math.min(10, meta));
}

const inicioSlice = createSlice({
  name: "inicio",
  initialState,
  reducers: {
    selecionarTermo(state, action: PayloadAction<string>) {
      state.termoSelecionado = action.payload;
    },
    definirMeta(state, action: PayloadAction<number>) {
      state.meta = limitarMeta(action.payload);
    },
    adicionarMateria: {
      reducer(
        state,
        action: PayloadAction<{ id: string; nome: string; cor: CorMateria; quantidadeFrentes: 1 | 2 }>
      ) {
        const { id, nome, cor, quantidadeFrentes } = action.payload;
        const frentes: Frente[] =
          quantidadeFrentes === 2
            ? [
                { id: `${id}-f1`, nome: "Frente 1", notas: {} },
                { id: `${id}-f2`, nome: "Frente 2", notas: {} },
              ]
            : [{ id: `${id}-unica`, nome: "Única", notas: {} }];
        state.materias.push({ id, nome, cor, frentes });
      },
      prepare(nome: string, cor: CorMateria, quantidadeFrentes: 1 | 2) {
        return { payload: { id: nanoid(), nome, cor, quantidadeFrentes } };
      },
    },
    removerMateria(state, action: PayloadAction<string>) {
      state.materias = state.materias.filter((materia) => materia.id !== action.payload);
    },
    definirNotaComponente(
      state,
      action: PayloadAction<{
        materiaId: string;
        frenteId: string;
        componente: keyof NotasFrente;
        valor: string;
        simulado?: boolean;
      }>
    ) {
      const { materiaId, frenteId, componente, valor, simulado } = action.payload;
      const materia = state.materias.find((m) => m.id === materiaId);
      const frente = materia?.frentes.find((f) => f.id === frenteId);
      if (!frente) return;

      const termo = state.termoSelecionado;
      const notasAtuais = frente.notas[termo] ?? notasVazias();
      frente.notas[termo] = { ...notasAtuais, [componente]: valor };

      const chave = chaveSimulado(materiaId, termo, frenteId, componente);
      if (simulado) {
        state.simulados[chave] = true;
      } else {
        delete state.simulados[chave];
      }
    },
    /**
     * Restaura estado persistido (rascunho) ao abrir o app —
     * docs/ARQUITETURA.md §6. `simulados` nunca vem do payload: é sempre
     * sessão nova, nunca persistido.
     */
    hidratar(state, action: PayloadAction<{ termoSelecionado: string; meta: number; materias: Materia[] }>) {
      state.termoSelecionado = action.payload.termoSelecionado;
      state.meta = action.payload.meta;
      state.materias = action.payload.materias;
      state.simulados = {};
    },
    limparSimulados(state) {
      const termo = state.termoSelecionado;
      for (const materia of state.materias) {
        for (const frente of materia.frentes) {
          const notasAtuais = frente.notas[termo];
          if (!notasAtuais) continue;
          const limpas = { ...notasAtuais };
          (Object.keys(limpas) as (keyof NotasFrente)[]).forEach((componente) => {
            const chave = chaveSimulado(materia.id, termo, frente.id, componente);
            if (state.simulados[chave]) {
              limpas[componente] = "";
              delete state.simulados[chave];
            }
          });
          frente.notas[termo] = limpas;
        }
      }
    },
  },
});

export const {
  selecionarTermo,
  definirMeta,
  adicionarMateria,
  removerMateria,
  definirNotaComponente,
  limparSimulados,
  hidratar,
} = inicioSlice.actions;
export default inicioSlice.reducer;
