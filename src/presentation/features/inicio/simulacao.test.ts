import { normalizarNota } from "./simulacao";

describe("normalizarNota", () => {
  it("tira zero à esquerda da parte inteira", () => {
    expect(normalizarNota("03,80")).toBe("3,80");
    expect(normalizarNota("007")).toBe("7");
  });

  it("mantém um único zero quando a parte inteira é só zero", () => {
    expect(normalizarNota("0")).toBe("0");
    expect(normalizarNota("00")).toBe("0");
    expect(normalizarNota("00,5")).toBe("0,5");
  });

  it("corta a parte decimal em no máximo 2 dígitos", () => {
    expect(normalizarNota("3,758")).toBe("3,75");
    expect(normalizarNota("9,999")).toBe("9,99");
  });

  it("não mexe em quem já está dentro do formato", () => {
    expect(normalizarNota("7,5")).toBe("7,5");
    expect(normalizarNota("10")).toBe("10");
    expect(normalizarNota("")).toBe("");
  });

  it("deixa o usuário no meio da digitação (vírgula sem decimal ainda)", () => {
    expect(normalizarNota("3,")).toBe("3,");
  });
});
