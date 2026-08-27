import Decimal from "decimal.js";
import spec from "../../../specs/formula-real-trimestral.json";
import { FormulaSpec } from "../formula/types";
import { calcularPontos } from "./pontos";
import { resolverRecuperacao } from "./recuperacao";
import { chaveCampo, sugerirMinimos } from "./sugestao";
import { FrenteComNotas, PONTOS_OBJETIVO } from "./tipos";

const FORMULA = spec as FormulaSpec;
const d = (n: number) => new Decimal(n);

/** Trimestre com todos os componentes lançados. */
const cheio = (at: number, ao: number, saep: number, tarefa: number) => ({
  at: d(at),
  ao: d(ao),
  saep: d(saep),
  tarefa: d(tarefa),
});

/** Trimestre com nada lançado. */
const vazio = () => ({ at: null, ao: null, saep: null, tarefa: null });

const umaFrente = (notas: FrenteComNotas["notas"]): FrenteComNotas[] => [{ id: "f1", notas }];

describe("calcularPontos — soma anual com o 3º trimestre dobrado", () => {
  test("matéria sem nenhuma nota: zero garantido, 40 possíveis, faltam 24", () => {
    const pontos = calcularPontos(FORMULA, umaFrente([vazio(), vazio(), vazio()]));

    expect(pontos.garantidos.toNumber()).toBe(0);
    expect(pontos.maximoPossivel.toNumber()).toBe(40);
    expect(pontos.falta.toNumber()).toBe(24);
    expect(pontos.alcancado).toBe(false);
    expect(pontos.inalcancavel).toBe(false);
  });

  test("média 6 nos três trimestres fecha exatamente os 24", () => {
    // (6×2 + 6 + 6)/4 + 0 = 6 em cada trimestre → 6 + 6 + 2×6 = 24
    const seis = cheio(6, 6, 6, 0);
    const pontos = calcularPontos(FORMULA, umaFrente([seis, seis, seis]));

    expect(pontos.garantidos.toNumber()).toBe(24);
    expect(pontos.alcancado).toBe(true);
    expect(pontos.falta.toNumber()).toBe(0);
  });

  test("o 3º trimestre vale o dobro do 1º", () => {
    const dez = cheio(10, 10, 10, 0);
    const noPrimeiro = calcularPontos(FORMULA, umaFrente([dez, vazio(), vazio()]));
    const noTerceiro = calcularPontos(FORMULA, umaFrente([vazio(), vazio(), dez]));

    expect(noPrimeiro.garantidos.toNumber()).toBe(10);
    expect(noTerceiro.garantidos.toNumber()).toBe(20);
  });

  test("zerar os dois primeiros trimestres torna os 24 inalcançáveis", () => {
    const zerado = cheio(0, 0, 0, 0);
    const pontos = calcularPontos(FORMULA, umaFrente([zerado, zerado, vazio()]));

    // Sobra só o 3º trimestre: 2 × 10 = 20 pontos possíveis.
    expect(pontos.maximoPossivel.toNumber()).toBe(20);
    expect(pontos.inalcancavel).toBe(true);
  });

  test("duas frentes: o total exibido e o veredito não divergem", () => {
    // Regressão: com as frentes arredondadas ANTES da média, a média do
    // trimestre caía em meio passo da escala (5,9 e 6,0 → 5,95) e o total
    // anual dava 23,95 — a tela exibia "24,0 de 24,0" e, ao lado, "faltam
    // 0,1 pontos", porque a comparação via 23,95. Um aluno via umas matérias
    // fecharem os 24 e outras, com o mesmo número na tela, não fecharem.
    const seis = cheio(6, 6, 6, 0);
    const abaixo = cheio(5.9, 5.9, 5.9, 0);
    const frentes: FrenteComNotas[] = [
      { id: "f1", notas: [seis, seis, seis] },
      { id: "f2", notas: [abaixo, seis, seis] },
    ];
    const pontos = calcularPontos(FORMULA, frentes);

    // (6,0 + 5,9)/2 = 5,95 → 6,0 no trimestre; 6 + 6 + 2×6 = 24.
    expect(pontos.mediasPorTrimestre[0].toNumber()).toBe(6);
    expect(pontos.garantidos.toNumber()).toBe(24);
    expect(pontos.alcancado).toBe(true);
    expect(pontos.falta.toNumber()).toBe(0);
  });

  test("o total garantido cai sempre na escala, nunca em meio passo", () => {
    const frentes: FrenteComNotas[] = [
      { id: "f1", notas: [cheio(7.3, 7.1, 7, 0), cheio(6.2, 6, 6, 0), vazio()] },
      { id: "f2", notas: [cheio(8.4, 8.1, 8, 0), cheio(5.5, 5.3, 5, 0), vazio()] },
    ];
    const { garantidos } = calcularPontos(FORMULA, frentes);

    expect(garantidos.times(10).mod(1).toNumber()).toBe(0);
  });

  test("matéria com duas frentes usa a média entre elas", () => {
    const frentes: FrenteComNotas[] = [
      { id: "f1", notas: [cheio(10, 10, 10, 0), vazio(), vazio()] },
      { id: "f2", notas: [cheio(0, 0, 0, 0), vazio(), vazio()] },
    ];
    const pontos = calcularPontos(FORMULA, frentes);

    expect(pontos.garantidos.toNumber()).toBe(5);
  });
});

describe("sugerirMinimos — menor esforço", () => {
  test("a sugestão realmente fecha os 24 quando aplicada", () => {
    const frentes = umaFrente([vazio(), vazio(), vazio()]);
    const resultado = sugerirMinimos(FORMULA, frentes);

    expect(resultado.tipo).toBe("sugestao");
    if (resultado.tipo !== "sugestao") return;

    const aplicada: FrenteComNotas[] = [
      {
        id: "f1",
        notas: frentes[0].notas.map((_, trimestre) =>
          Object.fromEntries(
            FORMULA.componentes.map((componente) => [
              componente.id,
              resultado.valores.get(
                chaveCampo({ frenteId: "f1", trimestre, componente: componente.id })
              )!,
            ])
          )
        ),
      },
    ];

    expect(calcularPontos(FORMULA, aplicada).garantidos.gte(PONTOS_OBJETIVO)).toBe(true);
  });

  test("pede a mesma fração do máximo de cada campo, não a mesma nota", () => {
    const resultado = sugerirMinimos(FORMULA, umaFrente([vazio(), vazio(), vazio()]));
    if (resultado.tipo !== "sugestao") throw new Error("esperava sugestão");

    const at = resultado.valores.get(chaveCampo({ frenteId: "f1", trimestre: 0, componente: "at" }))!;
    const tarefa = resultado.valores.get(
      chaveCampo({ frenteId: "f1", trimestre: 0, componente: "tarefa" })
    )!;

    // Tarefa vale no máximo 1 e AT vale 10: a mesma fração significa nota
    // dez vezes menor na tarefa, não a mesma nota nos dois campos.
    expect(tarefa.lt(at)).toBe(true);
    expect(tarefa.lte(1)).toBe(true);
  });

  test("quem já fechou os 24 não recebe sugestão", () => {
    const seis = cheio(6, 6, 6, 0);
    const resultado = sugerirMinimos(FORMULA, umaFrente([seis, seis, seis]));

    expect(resultado.tipo).toBe("jaAlcancado");
  });

  test("sem campo em aberto não há o que sugerir", () => {
    const zerado = cheio(0, 0, 0, 0);
    const resultado = sugerirMinimos(FORMULA, umaFrente([zerado, zerado, zerado]));

    expect(resultado.tipo).toBe("semCamposEmAberto");
  });

  test("objetivo fora de alcance é reportado como impossível, não como sugestão", () => {
    const zerado = cheio(0, 0, 0, 0);
    const resultado = sugerirMinimos(FORMULA, umaFrente([zerado, zerado, vazio()]));

    expect(resultado.tipo).toBe("impossivel");
    if (resultado.tipo !== "impossivel") return;
    expect(resultado.maximoPossivel.toNumber()).toBe(20);
  });
});

describe("resolverRecuperacao — a nota substitui onde render mais", () => {
  test("meta já batida não pede recuperação", () => {
    const frentes = umaFrente([cheio(8, 8, 8, 1), vazio(), vazio()]);
    const resultado = resolverRecuperacao(FORMULA, frentes, 0, d(7));

    expect(resultado.tipo).toBe("metaAtingida");
  });

  test("escolhe a AT, que pesa 2, em vez da Objetiva de mesmo valor", () => {
    // AT, Objetiva e SAEP com a mesma nota baixa: substituir a AT rende o
    // dobro, então é ela que deve exigir a menor nota de recuperação.
    const frentes = umaFrente([cheio(4, 4, 4, 0), vazio(), vazio()]);
    const resultado = resolverRecuperacao(FORMULA, frentes, 0, d(6));

    expect(resultado.tipo).toBe("precisa");
    if (resultado.tipo !== "precisa") return;
    expect(resultado.componente).toBe("at");
    expect(resultado.mediaResultante.gte(6)).toBe(true);
  });

  test("a nota devolvida é a menor que bate a meta", () => {
    const frentes = umaFrente([cheio(4, 4, 4, 0), vazio(), vazio()]);
    const resultado = resolverRecuperacao(FORMULA, frentes, 0, d(6));
    if (resultado.tipo !== "precisa") throw new Error("esperava precisar de recuperação");

    const passo = new Decimal(10).pow(-FORMULA.escala.casasDecimais);
    const umPassoAbaixo = resultado.notaNecessaria.minus(passo);

    // Substituindo pela nota sugerida, bate a meta; um passo abaixo, não.
    const comUmPassoAbaixo = umaFrente([
      { ...cheio(4, 4, 4, 0), [resultado.componente]: umPassoAbaixo },
      vazio(),
      vazio(),
    ]);
    const conferencia = resolverRecuperacao(FORMULA, comUmPassoAbaixo, 0, d(6));
    expect(conferencia.tipo).toBe("precisa");
  });

  test("prefere a frente mais fraca quando a matéria tem duas", () => {
    const frentes: FrenteComNotas[] = [
      { id: "forte", notas: [cheio(9, 9, 9, 1), vazio(), vazio()] },
      { id: "fraca", notas: [cheio(2, 2, 2, 0), vazio(), vazio()] },
    ];
    const resultado = resolverRecuperacao(FORMULA, frentes, 0, d(7));

    expect(resultado.tipo).toBe("precisa");
    if (resultado.tipo !== "precisa") return;
    expect(resultado.frenteId).toBe("fraca");
  });

  test("meta inalcançável com uma substituição é reportada como impossível", () => {
    // Zerado em tudo: trocar uma única nota por 10 leva a média a 5 (AT),
    // longe da meta 9.
    const frentes = umaFrente([cheio(0, 0, 0, 0), vazio(), vazio()]);
    const resultado = resolverRecuperacao(FORMULA, frentes, 0, d(9));

    expect(resultado.tipo).toBe("impossivel");
    if (resultado.tipo !== "impossivel") return;
    expect(resultado.melhorMedia.toNumber()).toBe(5);
  });

  test("a Tarefa não é candidata: recuperação não substitui bônus de entrega", () => {
    const frentes = umaFrente([cheio(5, 5, 5, 0), vazio(), vazio()]);
    const resultado = resolverRecuperacao(FORMULA, frentes, 0, d(6));

    expect(resultado.tipo).toBe("precisa");
    if (resultado.tipo !== "precisa") return;
    expect(resultado.componente).not.toBe("tarefa");
  });
});
