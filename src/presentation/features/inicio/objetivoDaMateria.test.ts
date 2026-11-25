import Decimal from "decimal.js";
import spec from "../../../../specs/formula-real-trimestral.json";
import { FormulaSpec } from "../../../domain/formula/types";
import { chaveSimulado, Materia, TERMOS } from "../../store/inicioSlice";
import { calcularObjetivoDaMateria, frentesParaDominio, sugestaoPorComponente } from "./objetivoDaMateria";

const FORMULA = spec as FormulaSpec;

/**
 * Escreve as quatro notas de um termo como antes, mas a SAEP não mora na
 * frente: `materiaCom` a separa para o mapa `saep` por termo (ver `saepDe`).
 */
const notas = (at: string, ao: string, saep: string, tarefa: string) => ({ at, ao, saep, tarefa });
type NotasDeTeste = ReturnType<typeof notas>;
const semNotas = () => notas("", "", "", "");

/** SAEP por termo extraída das notas de teste — a mesma para todas as frentes. */
function saepDe(porTermo: Record<string, NotasDeTeste>): Record<string, string> {
  return Object.fromEntries(Object.entries(porTermo).map(([termo, n]) => [termo, n.saep]));
}

function semSaep({ at, ao, tarefa }: NotasDeTeste) {
  return { at, ao, tarefa };
}

function materiaCom(porTermo: Record<string, NotasDeTeste>): Materia {
  return {
    id: "mat",
    nome: "Matemática",
    cor: "#7C5CD6",
    frentes: [
      {
        id: "fr",
        nome: "Única",
        notas: Object.fromEntries(TERMOS.map((termo) => [termo, semSaep(porTermo[termo] ?? semNotas())])),
      },
    ],
  };
}

describe("frentesParaDominio", () => {
  it("mapeia os trimestres pela posição em TERMOS e trata campo vazio como não lançado", () => {
    const porTermo = { [TERMOS[0]]: notas("8", "", "6", "1") };
    const frentes = frentesParaDominio(materiaCom(porTermo), {}, saepDe(porTermo));

    expect(frentes).toHaveLength(1);
    expect(frentes[0].notas).toHaveLength(TERMOS.length);
    expect(frentes[0].notas[0].at?.toNumber()).toBe(8);
    expect(frentes[0].notas[0].ao).toBeNull();
    expect(frentes[0].notas[0].saep?.toNumber()).toBe(6);
    expect(frentes[0].notas[2].at).toBeNull();
  });

  it("nota preenchida por simulação não vira ponto garantido", () => {
    const porTermo = { [TERMOS[0]]: notas("10", "10", "10", "1") };
    const materia = materiaCom(porTermo);
    const simulados = { [chaveSimulado("mat", TERMOS[0], "fr", "at")]: true };

    const semSimulacao = calcularObjetivoDaMateria(FORMULA, materia, TERMOS[0], 7, {}, saepDe(porTermo));
    const comSimulacao = calcularObjetivoDaMateria(FORMULA, materia, TERMOS[0], 7, simulados, saepDe(porTermo));

    expect(semSimulacao.pontos.garantidos.toNumber()).toBe(10);
    expect(comSimulacao.pontos.garantidos.toNumber()).toBeLessThan(10);
  });
});

describe("calcularObjetivoDaMateria", () => {
  it("matéria zerada: nada garantido, 24 faltando, e uma sugestão que fecha a conta", () => {
    const objetivo = calcularObjetivoDaMateria(FORMULA, materiaCom({}), TERMOS[0], 7, {}, {});

    expect(objetivo.pontos.garantidos.toNumber()).toBe(0);
    expect(objetivo.pontos.falta.toNumber()).toBe(24);
    expect(objetivo.sugestao.tipo).toBe("sugestao");
  });

  it("a recuperação olha o trimestre selecionado, não sempre o primeiro", () => {
    const porTermo = {
      [TERMOS[0]]: notas("9", "9", "9", "1"),
      // 5,5,5 dá média 5: abaixo da meta 7, mas ainda alcançável trocando a
      // AT por 10 — (10×2 + 5 + 5)/4 = 7,5. Com notas mais baixas, uma única
      // substituição não bastaria e o caso viraria "impossivel".
      [TERMOS[1]]: notas("5", "5", "5", "0"),
    };
    const materia = materiaCom(porTermo);

    const noPrimeiro = calcularObjetivoDaMateria(FORMULA, materia, TERMOS[0], 7, {}, saepDe(porTermo));
    const noSegundo = calcularObjetivoDaMateria(FORMULA, materia, TERMOS[1], 7, {}, saepDe(porTermo));

    expect(noPrimeiro.recuperacao.tipo).toBe("metaAtingida");
    expect(noSegundo.recuperacao.tipo).toBe("precisa");
  });
});

describe("sugestaoPorComponente", () => {
  it("agrupa a sugestão por componente, já que a fração exigida é a mesma", () => {
    const objetivo = calcularObjetivoDaMateria(FORMULA, materiaCom({}), TERMOS[0], 7, {}, {});
    const porComponente = sugestaoPorComponente(objetivo.sugestao);

    expect([...porComponente.keys()].sort()).toEqual(["ao", "at", "saep", "tarefa"]);
    // Tarefa vale no máximo 1: a mesma fração dá uma nota menor que a da AT.
    expect(porComponente.get("tarefa")!.lt(porComponente.get("at")!)).toBe(true);
  });

  it("devolve mapa vazio quando não há sugestão a dar", () => {
    const porTermo = {
      [TERMOS[0]]: notas("10", "10", "10", "1"),
      [TERMOS[1]]: notas("10", "10", "10", "1"),
      [TERMOS[2]]: notas("10", "10", "10", "1"),
    };
    const objetivo = calcularObjetivoDaMateria(FORMULA, materiaCom(porTermo), TERMOS[0], 7, {}, saepDe(porTermo));

    expect(objetivo.sugestao.tipo).toBe("jaAlcancado");
    expect(sugestaoPorComponente(objetivo.sugestao).size).toBe(0);
  });
});

describe("compatibilidade: matéria gravada por versão anterior", () => {
  it("frente sem a chave de um trimestre não quebra o cálculo", () => {
    // A 1.7.1 grava só os trimestres que o usuário tocou.
    const materia: Materia = {
      id: "mat",
      nome: "Física",
      cor: "#2F9E7E",
      frentes: [{ id: "fr", nome: "Única", notas: { [TERMOS[0]]: { at: "8", ao: "7", tarefa: "1" } } }],
    };

    const objetivo = calcularObjetivoDaMateria(FORMULA, materia, TERMOS[0], 7, {}, { [TERMOS[0]]: "6" });

    expect(objetivo.pontos.garantidos.gt(new Decimal(0))).toBe(true);
    expect(objetivo.pontos.inalcancavel).toBe(false);
  });
});
