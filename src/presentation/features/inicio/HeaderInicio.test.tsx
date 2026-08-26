import React from "react";
import { Linking, Platform } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import { HeaderInicio } from "./HeaderInicio";
import { CAMPO_PLATAFORMA, CAMPO_VERSAO, URL_FORMULARIO_FEEDBACK } from "../../shared/feedback";
import { NOVIDADES } from "../../shared/novidades";

// `Constants.expoConfig` vem vazio sob o Jest; o header lê a versão dele para
// achar o texto de novidades, então devolvemos a mesma versão de app.json.
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { version: require("../../../../app.json").expo.version } },
}));

/** `render` do RNTL 14 é assíncrono — daí o `await`, como no Inicio.test.tsx. */
async function renderizarHeader() {
  return render(<HeaderInicio termoSelecionado="1º Trimestre" onSelecionarTermo={() => {}} />);
}

describe("HeaderInicio — botão de feedback", () => {
  afterEach(() => jest.restoreAllMocks());

  it("abre o formulário de feedback no navegador", async () => {
    const abrir = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    const tela = await renderizarHeader();

    await fireEvent.press(tela.getByLabelText("Enviar feedback"));

    expect(abrir).toHaveBeenCalledTimes(1);
    expect(abrir.mock.calls[0][0]).toContain(URL_FORMULARIO_FEEDBACK);
  });

  it("manda versão e plataforma junto, e nada além disso", async () => {
    const abrir = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    const tela = await renderizarHeader();

    await fireEvent.press(tela.getByLabelText("Enviar feedback"));

    const url = new URL(abrir.mock.calls[0][0]);
    expect([...url.searchParams.keys()].sort()).toEqual([CAMPO_PLATAFORMA, CAMPO_VERSAO, "usp"].sort());
    expect(url.searchParams.get(CAMPO_PLATAFORMA)).toBeTruthy();
  });
});

/** Troca `Platform.OS` só durante o corpo passado — a constante é congelada. */
async function comPlataforma(os: string, corpo: () => Promise<void>) {
  const original = Platform.OS;
  Object.defineProperty(Platform, "OS", { value: os, configurable: true });
  try {
    await corpo();
  } finally {
    Object.defineProperty(Platform, "OS", { value: original, configurable: true });
  }
}

describe("HeaderInicio — novidades", () => {
  const ROTULO = "Ver as novidades desta versão";

  it("na web, mostra o ícone ao lado do feedback e abre a lista da versão", async () => {
    await comPlataforma("web", async () => {
      const tela = await renderizarHeader();

      await fireEvent.press(tela.getByLabelText(ROTULO));

      expect(tela.getByText("O que há de novo")).toBeTruthy();
      expect(tela.getByText(NOVIDADES[0].itens[0])).toBeTruthy();
    });
  });

  it("no app não há ícone — lá o modal aparece sozinho na primeira abertura da versão", async () => {
    await comPlataforma("android", async () => {
      const tela = await renderizarHeader();
      expect(tela.queryByLabelText(ROTULO)).toBeNull();
    });
  });
});
