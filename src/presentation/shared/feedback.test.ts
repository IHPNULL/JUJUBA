import {
  CAMPO_PLATAFORMA,
  CAMPO_VERSAO,
  montarUrlDeFeedback,
  URL_FORMULARIO_FEEDBACK,
} from "./feedback";

describe("montarUrlDeFeedback", () => {
  it("aponta para o formulário configurado", () => {
    const url = new URL(montarUrlDeFeedback({ versao: "1.8.0", plataforma: "android" }));
    expect(`${url.origin}${url.pathname}`).toBe(URL_FORMULARIO_FEEDBACK);
  });

  it("leva a versão no campo do formulário", () => {
    const url = new URL(montarUrlDeFeedback({ versao: "1.8.0", plataforma: "android" }));
    expect(url.searchParams.get(CAMPO_VERSAO)).toBe("1.8.0");
  });

  it.each([
    ["android", "App"],
    ["ios", "App"],
    ["web", "Web"],
  ])("traduz a plataforma %s para a opção %s do formulário", (os, opcao) => {
    const url = new URL(montarUrlDeFeedback({ versao: "1.8.0", plataforma: os }));
    expect(url.searchParams.get(CAMPO_PLATAFORMA)).toBe(opcao);
  });

  it("marca a URL como pré-preenchida, como o Google Forms exige", () => {
    const url = new URL(montarUrlDeFeedback({ versao: "1.8.0", plataforma: "web" }));
    expect(url.searchParams.get("usp")).toBe("pp_url");
  });

  it("usa 'desconhecida' quando a versão não está disponível", () => {
    const url = new URL(montarUrlDeFeedback({ versao: undefined, plataforma: "web" }));
    expect(url.searchParams.get(CAMPO_VERSAO)).toBe("desconhecida");
  });

  it("não carrega nenhum outro parâmetro além desses três", () => {
    const url = new URL(montarUrlDeFeedback({ versao: "1.8.0", plataforma: "ios" }));
    expect([...url.searchParams.keys()].sort()).toEqual([CAMPO_PLATAFORMA, CAMPO_VERSAO, "usp"].sort());
  });
});
