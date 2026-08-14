import inicioReducer, {
  adicionarMateria,
  definirMeta,
  definirNotaComponente,
  limparSimulados,
  removerMateria,
  selecionarTermo,
  TERMOS,
} from "./inicioSlice";

describe("inicioSlice", () => {
  const estadoInicial = inicioReducer(undefined, { type: "@@INIT" });

  it("começa no primeiro termo e meta 7", () => {
    expect(estadoInicial.termoSelecionado).toBe(TERMOS[0]);
    expect(estadoInicial.meta).toBe(7);
    expect(estadoInicial.materias).toEqual([]);
  });

  it("selecionarTermo atualiza termoSelecionado", () => {
    const proximo = inicioReducer(estadoInicial, selecionarTermo(TERMOS[1]));
    expect(proximo.termoSelecionado).toBe(TERMOS[1]);
  });

  it("adicionarMateria com 1 frente cria uma frente 'Única'", () => {
    const proximo = inicioReducer(estadoInicial, adicionarMateria("Matemática", "pink", 1));
    expect(proximo.materias).toHaveLength(1);
    expect(proximo.materias[0].frentes).toHaveLength(1);
    expect(proximo.materias[0].frentes[0].nome).toBe("Única");
  });

  it("adicionarMateria com 2 frentes cria 'Frente 1' e 'Frente 2'", () => {
    const proximo = inicioReducer(estadoInicial, adicionarMateria("Física", "plum", 2));
    expect(proximo.materias[0].frentes.map((f) => f.nome)).toEqual(["Frente 1", "Frente 2"]);
  });

  it("removerMateria remove pelo id", () => {
    const comMateria = inicioReducer(estadoInicial, adicionarMateria("Matemática", "pink", 1));
    const id = comMateria.materias[0].id;
    const semMateria = inicioReducer(comMateria, removerMateria(id));
    expect(semMateria.materias).toHaveLength(0);
  });

  it("definirMeta recorta para o intervalo [0, 10]", () => {
    expect(inicioReducer(estadoInicial, definirMeta(15)).meta).toBe(10);
    expect(inicioReducer(estadoInicial, definirMeta(-3)).meta).toBe(0);
    expect(inicioReducer(estadoInicial, definirMeta(6.5)).meta).toBe(6.5);
  });

  it("definirNotaComponente grava a nota no termo selecionado, sem afetar outros termos", () => {
    let estado = inicioReducer(estadoInicial, adicionarMateria("Matemática", "pink", 1));
    const materiaId = estado.materias[0].id;
    const frenteId = estado.materias[0].frentes[0].id;

    estado = inicioReducer(
      estado,
      definirNotaComponente({ materiaId, frenteId, componente: "at", valor: "8,5" })
    );
    expect(estado.materias[0].frentes[0].notas[TERMOS[0]].at).toBe("8,5");
    expect(estado.materias[0].frentes[0].notas[TERMOS[1]]).toBeUndefined();
  });

  it("definirNotaComponente com simulado=true marca a chave em `simulados`; limparSimulados apaga só o que foi simulado", () => {
    let estado = inicioReducer(estadoInicial, adicionarMateria("Matemática", "pink", 1));
    const materiaId = estado.materias[0].id;
    const frenteId = estado.materias[0].frentes[0].id;

    estado = inicioReducer(
      estado,
      definirNotaComponente({ materiaId, frenteId, componente: "at", valor: "digitado pelo usuário" })
    );
    estado = inicioReducer(
      estado,
      definirNotaComponente({ materiaId, frenteId, componente: "ao", valor: "6,4", simulado: true })
    );
    expect(Object.keys(estado.simulados)).toHaveLength(1);

    estado = inicioReducer(estado, limparSimulados());
    expect(estado.materias[0].frentes[0].notas[TERMOS[0]].at).toBe("digitado pelo usuário");
    expect(estado.materias[0].frentes[0].notas[TERMOS[0]].ao).toBe("");
    expect(estado.simulados).toEqual({});
  });

  it("limparSimulados só limpa o termo selecionado, preservando simulados de outros termos", () => {
    let estado = inicioReducer(estadoInicial, adicionarMateria("Matemática", "pink", 1));
    const materiaId = estado.materias[0].id;
    const frenteId = estado.materias[0].frentes[0].id;

    // Simula um campo no termo A (termo selecionado atualmente).
    estado = inicioReducer(
      estado,
      definirNotaComponente({ materiaId, frenteId, componente: "at", valor: "6,4", simulado: true })
    );

    // Troca para o termo B e simula um campo lá também.
    estado = inicioReducer(estado, selecionarTermo(TERMOS[1]));
    estado = inicioReducer(
      estado,
      definirNotaComponente({ materiaId, frenteId, componente: "ao", valor: "7,0", simulado: true })
    );
    expect(Object.keys(estado.simulados)).toHaveLength(2);

    // Limpa simulados apenas do termo B (termo selecionado no momento da chamada).
    estado = inicioReducer(estado, limparSimulados());

    // Termo B: campo simulado foi limpo e sua flag removida.
    expect(estado.materias[0].frentes[0].notas[TERMOS[1]].ao).toBe("");
    expect(Object.keys(estado.simulados)).toEqual([
      expect.stringContaining(`${materiaId}|${TERMOS[0]}|${frenteId}|at`),
    ]);

    // Termo A: nota simulada e sua flag em `simulados` continuam intactas.
    expect(estado.materias[0].frentes[0].notas[TERMOS[0]].at).toBe("6,4");
  });
});
