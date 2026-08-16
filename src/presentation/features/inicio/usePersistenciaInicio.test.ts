import React from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AppState, AppStateStatus } from "react-native";
import { usePersistenciaInicio } from "./usePersistenciaInicio";
import { CHAVE_RASCUNHO_INICIO, serializarEstadoInicio } from "./persistenciaInicio";
import inicioReducer, { adicionarMateria, definirMeta, TERMOS } from "../../store/inicioSlice";
import { RascunhoRepositoryDrizzle } from "../../../data/repositories/rascunhoRepositoryDrizzle";
import { createTestDatabase } from "../../../data/local/db/testClient";

const mockedAddEventListener = jest.spyOn(AppState, "addEventListener");

function criarLojaDeTeste() {
  return configureStore({ reducer: { inicio: inicioReducer } });
}

type TestStore = ReturnType<typeof criarLojaDeTeste>;

const ReduxProvider = Provider as unknown as React.ComponentType<{
  store: TestStore;
  children?: React.ReactNode;
}>;

async function renderUsePersistenciaInicio(store: TestStore, repositorio: RascunhoRepositoryDrizzle) {
  return renderHook(() => usePersistenciaInicio(repositorio, Promise.resolve()), {
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(ReduxProvider, { store }, children),
  });
}

function getAppStateChangeHandler(): (state: AppStateStatus) => void {
  const call = mockedAddEventListener.mock.calls.find(([event]) => event === "change");
  if (!call) throw new Error('AppState.addEventListener("change", ...) was not registered');
  return call[1];
}

/** Espera um tempo real — usado no lugar de fake timers, que conflitam com o
 *  scheduler do React entre testes sequenciais (`renderHook` + `act` async). */
function esperar(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedAddEventListener.mockImplementation(() => ({ remove: jest.fn() }) as unknown as ReturnType<typeof AppState.addEventListener>);
});

describe("usePersistenciaInicio", () => {
  it("fica pronto depois de checar o rascunho salvo", async () => {
    const repo = new RascunhoRepositoryDrizzle(createTestDatabase());
    const store = criarLojaDeTeste();

    const { result } = await renderUsePersistenciaInicio(store, repo);

    await waitFor(() => expect(result.current.pronto).toBe(true));
  });

  it("restaura termoSelecionado, meta e materias de um rascunho salvo anteriormente", async () => {
    const repo = new RascunhoRepositoryDrizzle(createTestDatabase());
    const materias = [
      { id: "m1", nome: "Química", cor: "pink" as const, frentes: [{ id: "m1-unica", nome: "Única", notas: {} }] },
    ];
    await repo.salvar({
      chave: CHAVE_RASCUNHO_INICIO,
      payloadJson: JSON.stringify({ termoSelecionado: TERMOS[2], meta: 8.5, materias }),
      atualizadoEm: "2026-08-16T10:00:00.000Z",
    });
    const store = criarLojaDeTeste();

    await renderUsePersistenciaInicio(store, repo);

    await waitFor(() => expect(store.getState().inicio.materias).toEqual(materias));
    expect(store.getState().inicio.termoSelecionado).toBe(TERMOS[2]);
    expect(store.getState().inicio.meta).toBe(8.5);
  });

  it("não mexe no estado inicial quando não existe rascunho salvo", async () => {
    const repo = new RascunhoRepositoryDrizzle(createTestDatabase());
    const store = criarLojaDeTeste();
    const estadoInicial = store.getState().inicio;

    const { result } = await renderUsePersistenciaInicio(store, repo);
    await waitFor(() => expect(result.current.pronto).toBe(true));

    expect(store.getState().inicio).toEqual(estadoInicial);
  });

  /**
   * As três asserções abaixo (debounce simples, coalescimento de mudanças
   * rápidas e flush imediato no background) ficam num único teste,
   * reaproveitando o mesmo `render`: acionar múltiplos `renderHook` com
   * esperas reais (`esperar`) em testes separados quebra o mount do teste
   * seguinte neste ambiente de teste (RTL + test-renderer) — sintoma
   * observado: o hook seguinte nunca chega a montar (`result.current`
   * permanece `null` indefinidamente). Um único render evita o gatilho.
   */
  it("salva com debounce, coalesce mudanças rápidas e descarrega imediatamente no background", async () => {
    const repo = new RascunhoRepositoryDrizzle(createTestDatabase());
    const salvarSpy = jest.spyOn(repo, "salvar");
    const store = criarLojaDeTeste();

    const { result } = await renderUsePersistenciaInicio(store, repo);
    await waitFor(() => expect(result.current.pronto).toBe(true));
    salvarSpy.mockClear(); // ignora o save redundante disparado pela própria hidratação

    // 1) debounce simples: só salva ~300ms depois da mudança.
    act(() => {
      store.dispatch(definirMeta(9));
    });
    expect(salvarSpy).not.toHaveBeenCalled();
    await waitFor(() => expect(salvarSpy).toHaveBeenCalledTimes(1));

    const payloadSalvo = salvarSpy.mock.calls[0][0];
    expect(payloadSalvo.chave).toBe(CHAVE_RASCUNHO_INICIO);
    expect(payloadSalvo.payloadJson).toBe(serializarEstadoInicio(store.getState().inicio));

    // 2) mudanças rápidas dentro da janela de debounce: só um save, com o estado final.
    salvarSpy.mockClear();
    act(() => {
      store.dispatch(adicionarMateria("Física", "pink", 1));
    });
    await act(() => esperar(100));
    act(() => {
      store.dispatch(definirMeta(8));
    });
    await waitFor(() => expect(salvarSpy).toHaveBeenCalledTimes(1));
    expect(salvarSpy.mock.calls[0][0].payloadJson).toBe(serializarEstadoInicio(store.getState().inicio));

    // 3) AppState indo para background descarrega na hora, sem esperar o debounce.
    salvarSpy.mockClear();
    act(() => {
      store.dispatch(definirMeta(7));
    });
    expect(salvarSpy).not.toHaveBeenCalled();

    const handleChange = getAppStateChangeHandler();
    act(() => {
      handleChange("background");
    });

    await waitFor(() => expect(salvarSpy).toHaveBeenCalledTimes(1));
    expect(salvarSpy.mock.calls[0][0].payloadJson).toBe(serializarEstadoInicio(store.getState().inicio));
  });
});
