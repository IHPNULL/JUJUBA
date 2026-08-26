import {
  NOVIDADES,
  lerVersaoVista,
  novidadeDaVersao,
  novidadeParaMostrar,
  serializarVersaoVista,
} from "./novidades";
import appJson from "../../../app.json";

const VERSAO_COM_NOVIDADE = NOVIDADES[0].versao;

describe("NOVIDADES", () => {
  it("não tem duas entradas para a mesma versão", () => {
    const versoes = NOVIDADES.map((novidade) => novidade.versao);
    expect(new Set(versoes).size).toBe(versoes.length);
  });

  it("tem uma entrada para a versão declarada em app.json", () => {
    expect(NOVIDADES.map((novidade) => novidade.versao)).toContain(appJson.expo.version);
  });
});

describe("serializarVersaoVista / lerVersaoVista", () => {
  it("faz a ida e volta da versão", () => {
    expect(lerVersaoVista(serializarVersaoVista("1.8.0"))).toBe("1.8.0");
  });

  it("devolve null para JSON inválido", () => {
    expect(lerVersaoVista("{isso não é json")).toBeNull();
  });

  it("devolve null para payload sem a versão", () => {
    expect(lerVersaoVista(JSON.stringify({ outra: "coisa" }))).toBeNull();
    expect(lerVersaoVista(JSON.stringify(null))).toBeNull();
    expect(lerVersaoVista(JSON.stringify("1.8.0"))).toBeNull();
  });
});

describe("novidadeParaMostrar", () => {
  it("mostra na primeira abertura depois de instalar (nada visto ainda)", () => {
    expect(novidadeParaMostrar(VERSAO_COM_NOVIDADE, null)?.versao).toBe(VERSAO_COM_NOVIDADE);
  });

  it("mostra quando a versão instalada mudou desde a última vista", () => {
    expect(novidadeParaMostrar(VERSAO_COM_NOVIDADE, "0.0.1")?.versao).toBe(VERSAO_COM_NOVIDADE);
  });

  it("não mostra de novo na mesma versão", () => {
    expect(novidadeParaMostrar(VERSAO_COM_NOVIDADE, VERSAO_COM_NOVIDADE)).toBeNull();
  });

  it("não mostra nada quando não há texto escrito para a versão instalada", () => {
    expect(novidadeParaMostrar("99.0.0", null)).toBeNull();
  });

  it("não mostra nada quando o runtime não sabe a versão", () => {
    expect(novidadeParaMostrar(undefined, null)).toBeNull();
  });
});

describe("novidadeDaVersao", () => {
  it("acha o texto da versão, mesmo que ela já tenha sido vista", () => {
    expect(novidadeDaVersao(VERSAO_COM_NOVIDADE)?.itens.length).toBeGreaterThan(0);
  });

  it("devolve null para versão sem texto escrito ou desconhecida", () => {
    expect(novidadeDaVersao("99.0.0")).toBeNull();
    expect(novidadeDaVersao(undefined)).toBeNull();
  });
});
