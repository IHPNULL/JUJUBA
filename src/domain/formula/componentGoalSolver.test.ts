import Decimal from "decimal.js";
import { resolverMinimosComponentes } from "./componentGoalSolver";
import { FormulaSpec } from "./types";
import spec from "../../../specs/formula-real-trimestral.json";

const specTipada = spec as FormulaSpec;

describe("resolverMinimosComponentes — specs/formula-real-trimestral", () => {
  it("retorna 'semVazios' quando todos os componentes já foram digitados", () => {
    const resultado = resolverMinimosComponentes(
      specTipada,
      { at: new Decimal(8), ao: new Decimal(7), saep: new Decimal(7), tarefa: new Decimal(1) },
      new Decimal(7)
    );
    expect(resultado.tipo).toBe("semVazios");
  });

  it("retorna 'jaAlcancado' quando o preenchido já bate a meta mesmo com vazios em zero", () => {
    const resultado = resolverMinimosComponentes(
      specTipada,
      { at: new Decimal(10), ao: new Decimal(10), saep: null, tarefa: new Decimal(1) },
      new Decimal(7)
    );
    expect(resultado.tipo).toBe("jaAlcancado");
    if (resultado.tipo === "jaAlcancado") {
      expect(resultado.valores.saep.toNumber()).toBe(0);
    }
  });

  it("distribui o déficit proporcionalmente entre AT e Objetiva vazios (SAEP=7, Tarefa=0,5, meta=7)", () => {
    // `have` vem de avaliarPeriodo, que SEMPRE arredonda (Task 2) — não é
    // 2.25 (bruto), é 2.3 (2.25 arredondado half_up a 1 casa). A partir daí:
    // coef(at) = (avaliarPeriodo({at:10,ao:0,saep:7,tarefa:0.5}) - have)/10
    //          = (7.3 - 2.3)/10 = 0.5   [avaliarPeriodo({at:10,...}) = 7.25 -> 7.3]
    // coef(ao) = (avaliarPeriodo({at:0,ao:10,saep:7,tarefa:0.5}) - have)/10
    //          = (4.8 - 2.3)/10 = 0.25  [avaliarPeriodo({ao:10,...}) = 4.75 -> 4.8]
    // capacidade = 0.5*10 + 0.25*10 = 7.5; déficit = 7 - 2.3 = 4.7
    // x = 4.7/7.5 = 0.62666...; valor bruto = x*10 = 6.2666... -> arredonda p/ cima 1 casa: 6.3
    // Verificação (o solver faz isso internamente, ver Step 3): avaliarPeriodo
    // com at=ao=6.3 dá (12.6+6.3+7)/4+0.5 = 6.975 -> arredonda para 7.0 >= meta. Confirma 6.3 sem precisar subir mais.
    const resultado = resolverMinimosComponentes(
      specTipada,
      { at: null, ao: null, saep: new Decimal(7), tarefa: new Decimal("0.5") },
      new Decimal(7)
    );
    expect(resultado.tipo).toBe("valores");
    if (resultado.tipo === "valores") {
      expect(resultado.valores.at.toNumber()).toBe(6.3);
      expect(resultado.valores.ao.toNumber()).toBe(6.3);
    }
  });

  it("o valor sugerido, aplicado de volta, realmente bate a meta (nunca fica abaixo por causa do arredondamento)", () => {
    const resultado = resolverMinimosComponentes(
      specTipada,
      { at: null, ao: null, saep: new Decimal(7), tarefa: new Decimal("0.5") },
      new Decimal(7)
    );
    expect(resultado.tipo).toBe("valores");
    if (resultado.tipo === "valores") {
      const { avaliarPeriodo } = jest.requireActual("./motorDeCalculo");
      const mediaComSugestao = avaliarPeriodo(specTipada, {
        at: resultado.valores.at,
        ao: resultado.valores.ao,
        saep: new Decimal(7),
        tarefa: new Decimal("0.5"),
      });
      expect(mediaComSugestao.gte(new Decimal(7))).toBe(true);
    }
  });

  it("retorna 'impossivel' quando nem com nota máxima nos vazios a meta é alcançável", () => {
    const resultado = resolverMinimosComponentes(
      specTipada,
      { at: null, ao: null, saep: new Decimal(0), tarefa: new Decimal(0) },
      new Decimal(10)
    );
    // have=0; capacidade = 0.5*10+0.25*10 = 7.5; déficit=10 > 7.5
    expect(resultado.tipo).toBe("impossivel");
    if (resultado.tipo === "impossivel") {
      expect(resultado.melhorPossivel.toNumber()).toBe(7.5);
    }
  });
});
