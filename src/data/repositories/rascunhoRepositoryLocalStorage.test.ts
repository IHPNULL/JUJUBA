import { RascunhoRepositoryLocalStorage } from "./rascunhoRepositoryLocalStorage";
import type { ArmazenamentoChaveValor } from "./rascunhoRepositoryLocalStorage";

function criarArmazenamentoFalso(): ArmazenamentoChaveValor {
  const dados = new Map<string, string>();
  return {
    getItem: (chave) => dados.get(chave) ?? null,
    setItem: (chave, valor) => {
      dados.set(chave, valor);
    },
    removeItem: (chave) => {
      dados.delete(chave);
    },
  };
}

describe("RascunhoRepositoryLocalStorage", () => {
  it("salva e lê um rascunho por chave", async () => {
    const repo = new RascunhoRepositoryLocalStorage(criarArmazenamentoFalso());

    await repo.salvar({
      chave: "inicio",
      payloadJson: JSON.stringify({ valor: "8.7" }),
      atualizadoEm: "2026-03-11T10:00:00.000Z",
    });

    const lido = await repo.obterPorChave("inicio");
    expect(lido?.payloadJson).toBe(JSON.stringify({ valor: "8.7" }));
  });

  it("salvar é upsert: sobrescreve o valor anterior para a mesma chave", async () => {
    const repo = new RascunhoRepositoryLocalStorage(criarArmazenamentoFalso());
    const chave = "rascunho-1";

    await repo.salvar({ chave, payloadJson: "primeiro", atualizadoEm: "2026-03-11T10:00:00.000Z" });
    await repo.salvar({ chave, payloadJson: "segundo", atualizadoEm: "2026-03-11T10:05:00.000Z" });

    const lido = await repo.obterPorChave(chave);
    expect(lido?.payloadJson).toBe("segundo");
    expect(lido?.atualizadoEm).toBe("2026-03-11T10:05:00.000Z");
  });

  it("remove um rascunho", async () => {
    const repo = new RascunhoRepositoryLocalStorage(criarArmazenamentoFalso());
    const chave = "rascunho-2";

    await repo.salvar({ chave, payloadJson: "x", atualizadoEm: "2026-03-11T10:00:00.000Z" });
    await repo.remover(chave);

    expect(await repo.obterPorChave(chave)).toBeNull();
  });

  it("retorna null para chave inexistente", async () => {
    const repo = new RascunhoRepositoryLocalStorage(criarArmazenamentoFalso());
    expect(await repo.obterPorChave("nao-existe")).toBeNull();
  });

  it("chaves diferentes não colidem no mesmo armazenamento", async () => {
    const armazenamento = criarArmazenamentoFalso();
    const repo = new RascunhoRepositoryLocalStorage(armazenamento);

    await repo.salvar({ chave: "a", payloadJson: "valor-a", atualizadoEm: "2026-03-11T10:00:00.000Z" });
    await repo.salvar({ chave: "b", payloadJson: "valor-b", atualizadoEm: "2026-03-11T10:00:00.000Z" });

    expect((await repo.obterPorChave("a"))?.payloadJson).toBe("valor-a");
    expect((await repo.obterPorChave("b"))?.payloadJson).toBe("valor-b");
  });
});
