import Decimal from "decimal.js";
import { avaliarAno } from "./motorDeCalculo";
import { FormulaSpec } from "./types";
import spec from "../../../specs/exemplo-media-bimestral.json";
import goldens from "../../../specs/exemplo-media-bimestral.golden.json";

interface CasoGolden {
  nome: string;
  entrada: {
    P1: number;
    P2: number;
    P3: number;
    P4: number;
    recuperacao: number | null;
    frequencia: number;
  };
  esperado: {
    mediaAnual?: number;
    mediaFinal?: number;
    situacao: string;
  };
}

describe("MotorDeCalculo — specs/exemplo-media-bimestral", () => {
  test.each(goldens as CasoGolden[])("$nome", ({ entrada, esperado }) => {
    const resultado = avaliarAno(spec as FormulaSpec, {
      periodos: [entrada.P1, entrada.P2, entrada.P3, entrada.P4].map((v) => new Decimal(v)),
      recuperacao: entrada.recuperacao === null ? null : new Decimal(entrada.recuperacao),
      frequencia: new Decimal(entrada.frequencia),
    });

    if (esperado.mediaAnual !== undefined) {
      expect(resultado.mediaAnual?.toNumber()).toBe(esperado.mediaAnual);
    }
    if (esperado.mediaFinal !== undefined) {
      expect(resultado.mediaFinal.toNumber()).toBe(esperado.mediaFinal);
    }
    expect(resultado.situacao).toBe(esperado.situacao);
  });
});
