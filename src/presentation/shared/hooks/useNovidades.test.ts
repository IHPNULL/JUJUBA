import { renderHook, act, waitFor } from "@testing-library/react-native";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { RascunhoRepositoryLocalStorage } from "../../../data/repositories/rascunhoRepositoryLocalStorage";
import type { ArmazenamentoChaveValor } from "../../../data/repositories/rascunhoRepositoryLocalStorage";
import { CHAVE_RASCUNHO_NOVIDADES, NOVIDADES, serializarVersaoVista } from "../novidades";
import { useNovidades } from "./useNovidades";

const VERSAO = NOVIDADES[0].versao;

// `Constants.expoConfig` vem vazio sob o Jest; cada teste escreve a versão
// que quer simular neste mock.
jest.mock("expo-constants", () => ({ __esModule: true, default: { expoConfig: null } }));
const constantes = Constants as unknown as { expoConfig: { version: string } | null };

/** `localStorage` de mentira — o mesmo contrato que a build web injeta. */
function criarArmazenamento(inicial: Record<string, string> = {}): ArmazenamentoChaveValor {
  const dados = new Map(Object.entries(inicial));
  return {
    getItem: (chave) => dados.get(chave) ?? null,
    setItem: (chave, valor) => void dados.set(chave, valor),
    removeItem: (chave) => void dados.delete(chave),
  };
}

async function renderizar(armazenamento: ArmazenamentoChaveValor) {
  const repositorio = new RascunhoRepositoryLocalStorage(armazenamento);
  return { repositorio, ...(await renderHook(() => useNovidades(repositorio, Promise.resolve()))) };
}

beforeEach(() => {
  constantes.expoConfig = { version: VERSAO };
});

describe("useNovidades", () => {
  it("abre o modal quando nenhuma versão foi vista ainda", async () => {
    const { result } = await renderizar(criarArmazenamento());
    await waitFor(() => expect(result.current.novidade?.versao).toBe(VERSAO));
  });

  it("não abre quando a versão instalada já foi vista", async () => {
    const armazenamento = criarArmazenamento({
      [`rascunho:${CHAVE_RASCUNHO_NOVIDADES}`]: JSON.stringify({
        chave: CHAVE_RASCUNHO_NOVIDADES,
        payloadJson: serializarVersaoVista(VERSAO),
        atualizadoEm: "2026-01-01T00:00:00.000Z",
      }),
    });
    const { result } = await renderizar(armazenamento);

    // Uma volta no microtask queue: tempo de a leitura terminar e, se fosse
    // abrir, abrir. `novidade` continuar null é a asserção.
    await act(async () => {});
    expect(result.current.novidade).toBeNull();
  });

  it("volta a abrir depois de uma atualização (versão vista é a antiga)", async () => {
    const armazenamento = criarArmazenamento({
      [`rascunho:${CHAVE_RASCUNHO_NOVIDADES}`]: JSON.stringify({
        chave: CHAVE_RASCUNHO_NOVIDADES,
        payloadJson: serializarVersaoVista("0.0.1"),
        atualizadoEm: "2026-01-01T00:00:00.000Z",
      }),
    });
    const { result } = await renderizar(armazenamento);
    await waitFor(() => expect(result.current.novidade?.versao).toBe(VERSAO));
  });

  it("fechar esconde o modal e grava a versão, que não reabre na sessão seguinte", async () => {
    const armazenamento = criarArmazenamento();
    const primeira = await renderizar(armazenamento);
    await waitFor(() => expect(primeira.result.current.novidade).not.toBeNull());

    await act(async () => {
      primeira.result.current.fechar();
    });
    expect(primeira.result.current.novidade).toBeNull();

    const segunda = await renderizar(armazenamento);
    await act(async () => {});
    expect(segunda.result.current.novidade).toBeNull();
  });

  it("nunca abre sozinho na web — lá o texto fica atrás do ícone do topo", async () => {
    const original = Platform.OS;
    Object.defineProperty(Platform, "OS", { value: "web", configurable: true });
    try {
      const { result } = await renderizar(criarArmazenamento());
      await act(async () => {});
      expect(result.current.novidade).toBeNull();
    } finally {
      Object.defineProperty(Platform, "OS", { value: original, configurable: true });
    }
  });

  it("não abre nem grava nada quando o runtime não sabe a versão", async () => {
    constantes.expoConfig = null;
    const armazenamento = criarArmazenamento();
    const { result, repositorio } = await renderizar(armazenamento);

    await act(async () => {});
    expect(result.current.novidade).toBeNull();

    await act(async () => {
      result.current.fechar();
    });
    expect(await repositorio.obterPorChave(CHAVE_RASCUNHO_NOVIDADES)).toBeNull();
  });
});
