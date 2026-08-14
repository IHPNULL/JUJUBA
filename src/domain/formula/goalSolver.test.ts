import Decimal from "decimal.js";
import { resolverMeta } from "./goalSolver";
import { avaliarAno } from "./motorDeCalculo";
import { FormulaError, FormulaSpec } from "./types";
import spec from "../../../specs/exemplo-media-bimestral.json";

const especificacao = spec as FormulaSpec;

function d(v: number): Decimal {
  return new Decimal(v);
}

describe("resolverMeta — specs/exemplo-media-bimestral", () => {
  test("precisaDe: P1-P3 conhecidos, quanto precisa em P4 para aprovar", () => {
    // P1+P2+P3 = 15.49; raw mediaAnual = (15.49 + x) / 4; a fronteira de
    // arredondamento half_up para 6,0 cai em x = 8,31 (raw exato) — não
    // alinhado à grade de 0,1, então o menor valor de escala que aprova é 8,4
    // (8,3 arredonda mediaAnual para 5,9 e reprova).
    const resultado = resolverMeta({
      spec: especificacao,
      periodos: [d(5.37), d(4.83), d(5.29), null],
      recuperacao: null,
      frequencia: d(0.9),
      alvo: { tipo: "periodo", indice: 3 },
    });

    expect(resultado.tipo).toBe("precisaDe");
    if (resultado.tipo !== "precisaDe") throw new Error("esperava precisaDe");
    expect(resultado.valor.toString()).toBe("8.4");

    // Segurança: o valor reportado realmente aprova.
    const comValor = avaliarAno(especificacao, {
      periodos: [d(5.37), d(4.83), d(5.29), resultado.valor],
      recuperacao: null,
      frequencia: d(0.9),
    });
    expect(comValor.situacao).toBe("aprovado");

    // Justeza: um passo de escala (0,1) abaixo do reportado NÃO deve aprovar
    // — nunca reportar mais do que o estritamente necessário.
    const umPassoAbaixo = avaliarAno(especificacao, {
      periodos: [d(5.37), d(4.83), d(5.29), resultado.valor.minus("0.1")],
      recuperacao: null,
      frequencia: d(0.9),
    });
    expect(umPassoAbaixo.situacao).not.toBe("aprovado");
  });

  test("jaPassou: media já garante aprovação mesmo com a pior nota (0) em P4", () => {
    const resultado = resolverMeta({
      spec: especificacao,
      periodos: [d(9), d(9), d(9), null],
      recuperacao: null,
      frequencia: d(0.92),
      alvo: { tipo: "periodo", indice: 3 },
    });

    expect(resultado.tipo).toBe("jaPassou");
    if (resultado.tipo !== "jaPassou") throw new Error("esperava jaPassou");
    expect(resultado.mediaFinalNoPior.toString()).toBe("6.8");
  });

  test("naoEPossivel: nem com a nota máxima (10) em P4 dá para aprovar", () => {
    const resultado = resolverMeta({
      spec: especificacao,
      periodos: [d(1), d(1), d(1), null],
      recuperacao: null,
      frequencia: d(0.92),
      alvo: { tipo: "periodo", indice: 3 },
    });

    expect(resultado.tipo).toBe("naoEPossivel");
    if (resultado.tipo !== "naoEPossivel") throw new Error("esperava naoEPossivel");
    expect(resultado.melhorMediaFinal.toString()).toBe("3.3");
  });

  test("precisaDe: alvo é a recuperação (todos os períodos já conhecidos)", () => {
    // mediaAnual = round((5+5+5+5.3)/4, 1) = 5.1 (Decimal já arredondado).
    // mediaFinal = max(mediaAnual, (mediaAnual + recuperacao) / 2).
    // Fronteira exata: recuperacao = 6.8 -> raw 5.95 -> arredonda para 6,0.
    const resultado = resolverMeta({
      spec: especificacao,
      periodos: [d(5), d(5), d(5), d(5.3)],
      recuperacao: null,
      frequencia: d(0.9),
      alvo: { tipo: "recuperacao" },
    });

    expect(resultado.tipo).toBe("precisaDe");
    if (resultado.tipo !== "precisaDe") throw new Error("esperava precisaDe");
    expect(resultado.valor.toString()).toBe("6.8");

    const comValor = avaliarAno(especificacao, {
      periodos: [d(5), d(5), d(5), d(5.3)],
      recuperacao: resultado.valor,
      frequencia: d(0.9),
    });
    expect(comValor.situacao).toBe("aprovado");
  });

  test("valida quantidade de períodos", () => {
    expect(() =>
      resolverMeta({
        spec: especificacao,
        periodos: [d(5), d(5), d(5)],
        recuperacao: null,
        frequencia: d(0.9),
        alvo: { tipo: "periodo", indice: 3 },
      })
    ).toThrow(FormulaError);
  });

  test("valida que os demais períodos (além do alvo) estão preenchidos", () => {
    expect(() =>
      resolverMeta({
        spec: especificacao,
        periodos: [d(5), null, d(5), null],
        recuperacao: null,
        frequencia: d(0.9),
        alvo: { tipo: "periodo", indice: 3 },
      })
    ).toThrow(FormulaError);
  });

  test("valida índice de período fora do intervalo", () => {
    expect(() =>
      resolverMeta({
        spec: especificacao,
        periodos: [d(5), d(5), d(5), d(5)],
        recuperacao: null,
        frequencia: d(0.9),
        alvo: { tipo: "periodo", indice: 4 },
      })
    ).toThrow(FormulaError);
  });
});

describe("resolverMeta — não-monotonicidade", () => {
  // Spec sintética só para este teste: mediaFinal deliberadamente NÃO é
  // monotônica em mediaAnual (sobe, desce, sobe de novo), para verificar que
  // o solver recusa adivinhar em vez de bissectar um resultado errado.
  const specNaoMonotonica: FormulaSpec = {
    schemaVersion: 1,
    id: "sintetica-nao-monotonica",
    versao: 1,
    nome: "Spec sintética para teste de monotonicidade",
    periodos: { tipo: "bimestre", quantidade: 1 },
    escala: { min: 0, max: 10, casasDecimais: 1, arredondamento: "half_up" },
    componentes: [],
    calculos: {
      mediaPeriodo: "P1",
      mediaAnual: "media(periodos)",
      mediaFinal: "se(mediaAnual <= 3, mediaAnual, se(mediaAnual <= 7, 10 - mediaAnual, mediaAnual))",
    },
    criterios: {
      aprovado: "mediaFinal >= 6 && frequencia >= 0.75",
      reprovado: "mediaFinal < 6 || frequencia < 0.75",
    },
  };

  test("indeterminado quando f não é monotônica não-decrescente no domínio amostrado", () => {
    const resultado = resolverMeta({
      spec: specNaoMonotonica,
      periodos: [null],
      recuperacao: null,
      frequencia: d(0.9),
      alvo: { tipo: "periodo", indice: 0 },
    });

    expect(resultado.tipo).toBe("indeterminado");
    if (resultado.tipo !== "indeterminado") throw new Error("esperava indeterminado");
    expect(resultado.motivo).toMatch(/monotôn/);
  });
});
