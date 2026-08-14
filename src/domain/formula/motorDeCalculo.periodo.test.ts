import Decimal from "decimal.js";
import { avaliarPeriodo, mediaEntreFrentes } from "./motorDeCalculo";
import { FormulaSpec } from "./types";
import spec from "../../../specs/formula-real-trimestral.json";
import goldens from "../../../specs/formula-real-trimestral.golden.json";

interface CasoGolden {
  nome: string;
  entrada: { at: number; ao: number; saep: number; tarefa: number };
  esperado: number;
}

describe("avaliarPeriodo — specs/formula-real-trimestral", () => {
  test.each(goldens as CasoGolden[])("$nome", ({ entrada, esperado }) => {
    const componentes = {
      at: new Decimal(entrada.at),
      ao: new Decimal(entrada.ao),
      saep: new Decimal(entrada.saep),
      tarefa: new Decimal(entrada.tarefa),
    };
    const resultado = avaliarPeriodo(spec as FormulaSpec, componentes);
    expect(resultado.toNumber()).toBe(esperado);
  });
});

describe("mediaEntreFrentes", () => {
  it("calcula a média aritmética simples entre frentes", () => {
    const resultado = mediaEntreFrentes([new Decimal("7.4"), new Decimal("5.0")]);
    expect(resultado.toNumber()).toBe(6.2);
  });

  it("funciona com uma única frente (matéria de frente única)", () => {
    const resultado = mediaEntreFrentes([new Decimal("8.3")]);
    expect(resultado.toNumber()).toBe(8.3);
  });

  it("lança FormulaError se a lista estiver vazia", () => {
    expect(() => mediaEntreFrentes([])).toThrow("mediaEntreFrentes");
  });
});
