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
