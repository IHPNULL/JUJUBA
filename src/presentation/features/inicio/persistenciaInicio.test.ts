import { hidratarPayloadInicio, serializarEstadoInicio } from "./persistenciaInicio";
import type { InicioState } from "./persistenciaInicio";
import { TERMOS } from "../../store/inicioSlice";

function estadoDeExemplo(): InicioState {
  return {
    termoSelecionado: TERMOS[1],
    meta: 8.5,
    materias: [
      {
        id: "materia-1",
        nome: "Química",
        cor: "pink",
        frentes: [{ id: "materia-1-unica", nome: "Única", notas: { [TERMOS[1]]: { at: "8,0", ao: "", saep: "", tarefa: "" } } }],
      },
    ],
    simulados: { "materia-1|termo|frente|at": true },
  };
}

describe("serializarEstadoInicio", () => {
  it("inclui termoSelecionado, meta e materias, mas nunca simulados", () => {
    const json = serializarEstadoInicio(estadoDeExemplo());
    const payload = JSON.parse(json);

    expect(payload).toEqual({
      termoSelecionado: TERMOS[1],
      meta: 8.5,
      materias: estadoDeExemplo().materias,
    });
    expect(payload.simulados).toBeUndefined();
  });
});

/**
 * Só nota digitada vira rascunho. O que o "Simular" preencheu é sugestão
 * recalculável e não pode ser gravado: `simulados` não é persistido, então
 * uma nota simulada que fosse salva voltaria na sessão seguinte já sem a
 * marca — indistinguível de nota real, entrando na média e no destaque de
 * campo digitado.
 */
describe("serializarEstadoInicio — notas simuladas", () => {
  /** Matéria de duas frentes, com nota em dois termos. */
  function estadoComSimuladas(): InicioState {
    return {
      termoSelecionado: TERMOS[0],
      meta: 7,
      materias: [
        {
          id: "mat-1",
          nome: "Física",
          cor: "#2F9E7E",
          frentes: [
            {
              id: "fr-1",
              nome: "Frente 1",
              notas: {
                [TERMOS[0]]: { at: "5,0", ao: "7,5", saep: "7,5", tarefa: "0,8" },
                [TERMOS[1]]: { at: "6,0", ao: "9,0", saep: "", tarefa: "" },
              },
            },
            {
              id: "fr-2",
              nome: "Frente 2",
              notas: { [TERMOS[0]]: { at: "8,0", ao: "", saep: "", tarefa: "" } },
            },
          ],
        },
      ],
      // AT foi digitado; AO/SAEP/Tarefa saíram do solver — inclusive num
      // segundo termo, que `limparSimulados` (só o termo em tela) não veria.
      simulados: {
        "mat-1|1º Tri|fr-1|ao": true,
        "mat-1|1º Tri|fr-1|saep": true,
        "mat-1|1º Tri|fr-1|tarefa": true,
        "mat-1|2º Tri|fr-1|ao": true,
      },
    };
  }

  it("grava as notas digitadas e zera as simuladas, em todos os termos", () => {
    const payload = JSON.parse(serializarEstadoInicio(estadoComSimuladas()));
    const frente = payload.materias[0].frentes[0];

    expect(frente.notas[TERMOS[0]]).toEqual({ at: "5,0", ao: "", saep: "", tarefa: "" });
    expect(frente.notas[TERMOS[1]]).toEqual({ at: "6,0", ao: "", saep: "", tarefa: "" });
    // Frente sem nada simulado passa intacta.
    expect(payload.materias[0].frentes[1].notas[TERMOS[0]].at).toBe("8,0");
  });

  it("não altera o estado em memória ao serializar", () => {
    const estado = estadoComSimuladas();
    serializarEstadoInicio(estado);

    // A nota simulada continua na tela — some só do que foi gravado.
    expect(estado.materias[0].frentes[0].notas[TERMOS[0]].ao).toBe("7,5");
  });

  it("preserva as notas quando nada foi simulado", () => {
    const estado = { ...estadoComSimuladas(), simulados: {} };
    const payload = JSON.parse(serializarEstadoInicio(estado));

    expect(payload.materias).toEqual(estado.materias);
  });
});

describe("hidratarPayloadInicio", () => {
  it("faz o round-trip com serializarEstadoInicio", () => {
    const original = estadoDeExemplo();
    const payload = hidratarPayloadInicio(serializarEstadoInicio(original));

    expect(payload).toEqual({
      termoSelecionado: original.termoSelecionado,
      meta: original.meta,
      materias: original.materias,
    });
  });

  it("retorna null para JSON malformado", () => {
    expect(hidratarPayloadInicio("{ isso não é json")).toBeNull();
  });

  it("retorna null quando o formato não bate com o esperado", () => {
    expect(hidratarPayloadInicio(JSON.stringify({ termoSelecionado: "1º Tri" }))).toBeNull();
    expect(hidratarPayloadInicio(JSON.stringify({ termoSelecionado: 1, meta: 7, materias: [] }))).toBeNull();
    expect(hidratarPayloadInicio(JSON.stringify({ termoSelecionado: "1º Tri", meta: 7, materias: "não é array" }))).toBeNull();
  });
});

/**
 * Compatibilidade com dado gravado por versões anteriores. Quem já usa o app
 * não pode perder nota nenhuma ao atualizar: o payload abaixo é exatamente o
 * formato que a 1.7.1 grava, escrito à mão de propósito — se alguém mudar o
 * formato de gravação, este teste continua cobrando que o formato ANTIGO
 * ainda seja lido.
 *
 * As chaves de `notas` são os rótulos dos trimestres (`TERMOS`). Renomear um
 * rótulo órfã as notas já gravadas naquele trimestre, então os rótulos são
 * parte do contrato de dados, não texto de UI livre.
 */
describe("compatibilidade com versões anteriores", () => {
  const PAYLOAD_1_7_1 = JSON.stringify({
    termoSelecionado: "2º Tri",
    meta: 7,
    materias: [
      {
        id: "mat-1",
        nome: "Matemática",
        cor: "#7C5CD6",
        frentes: [
          {
            id: "fr-1",
            nome: "Única",
            notas: {
              "1º Tri": { at: "8,5", ao: "7", saep: "6", tarefa: "1" },
              "2º Tri": { at: "9", ao: "", saep: "", tarefa: "" },
              "3º Tri": { at: "", ao: "", saep: "", tarefa: "" },
            },
          },
        ],
      },
      {
        id: "mat-2",
        nome: "Física",
        cor: "#2F9E7E",
        frentes: [
          {
            id: "fr-2",
            nome: "Frente 1",
            notas: { "1º Tri": { at: "7", ao: "6,5", saep: "7", tarefa: "0,5" } },
          },
          {
            id: "fr-3",
            nome: "Frente 2",
            notas: { "1º Tri": { at: "8", ao: "", saep: "", tarefa: "1" } },
          },
        ],
      },
    ],
  });

  test("payload gravado pela 1.7.1 é lido sem perder nenhuma nota", () => {
    const payload = hidratarPayloadInicio(PAYLOAD_1_7_1);

    expect(payload).not.toBeNull();
    expect(payload!.termoSelecionado).toBe("2º Tri");
    expect(payload!.meta).toBe(7);
    expect(payload!.materias).toHaveLength(2);

    const matematica = payload!.materias[0];
    expect(matematica.nome).toBe("Matemática");
    expect(matematica.frentes[0].notas["1º Tri"]).toEqual({
      at: "8,5",
      ao: "7",
      saep: "6",
      tarefa: "1",
    });
    expect(matematica.frentes[0].notas["2º Tri"].at).toBe("9");

    // Matéria com duas frentes sobrevive inteira, com as notas de cada uma.
    const fisica = payload!.materias[1];
    expect(fisica.frentes.map((frente) => frente.nome)).toEqual(["Frente 1", "Frente 2"]);
    expect(fisica.frentes[1].notas["1º Tri"].tarefa).toBe("1");
  });

  test("payload antigo continua legível depois de reserializado", () => {
    const lido = hidratarPayloadInicio(PAYLOAD_1_7_1)!;
    const regravado = serializarEstadoInicio({ ...lido, simulados: {} });

    expect(hidratarPayloadInicio(regravado)).toEqual(lido);
  });
});
