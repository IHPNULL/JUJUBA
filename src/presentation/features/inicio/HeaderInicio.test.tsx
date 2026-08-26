import React from "react";
import { Linking } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import { HeaderInicio } from "./HeaderInicio";
import { CAMPO_PLATAFORMA, CAMPO_VERSAO, URL_FORMULARIO_FEEDBACK } from "../../shared/feedback";

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
