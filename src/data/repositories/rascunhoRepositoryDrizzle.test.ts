/**
 * Testes de repositório carregam `better-sqlite3` (addon nativo N-API) via
 * `createTestDatabase`. O preset do jest-expo roda tudo no ambiente
 * customizado do React Native, e carregar um addon nativo nesse ambiente
 * derrubava o processo com SIGSEGV no `dlopen` (crash no CI Linux, ver
 * backtrace em napi_module_register_by_symbol). Estes testes são Node puro
 * — sem React, sem RN — então rodam no ambiente `node`.
 *
 * @jest-environment node
 */
import { createTestDatabase } from "../local/db/testClient";
import type { AppDatabase } from "../local/db/client";
import { RascunhoRepositoryDrizzle } from "./rascunhoRepositoryDrizzle";

describe("RascunhoRepositoryDrizzle", () => {
  let db: AppDatabase;
  let repo: RascunhoRepositoryDrizzle;

  beforeEach(() => {
    db = createTestDatabase();
    repo = new RascunhoRepositoryDrizzle(db);
  });

  it("salva e lê um rascunho por chave", async () => {
    await repo.salvar({
      chave: "materia/materia-matematica/avaliacao-prova-1/nota",
      payloadJson: JSON.stringify({ valor: "8.7" }),
      atualizadoEm: "2026-03-11T10:00:00.000Z",
    });

    const lido = await repo.obterPorChave("materia/materia-matematica/avaliacao-prova-1/nota");
    expect(lido?.payloadJson).toBe(JSON.stringify({ valor: "8.7" }));
  });

  it("salvar é upsert: sobrescreve o valor anterior para a mesma chave", async () => {
    const chave = "rascunho-1";
    await repo.salvar({ chave, payloadJson: "primeiro", atualizadoEm: "2026-03-11T10:00:00.000Z" });
    await repo.salvar({ chave, payloadJson: "segundo", atualizadoEm: "2026-03-11T10:05:00.000Z" });

    const lido = await repo.obterPorChave(chave);
    expect(lido?.payloadJson).toBe("segundo");
    expect(lido?.atualizadoEm).toBe("2026-03-11T10:05:00.000Z");
  });

  it("remove um rascunho", async () => {
    const chave = "rascunho-2";
    await repo.salvar({ chave, payloadJson: "x", atualizadoEm: "2026-03-11T10:00:00.000Z" });
    await repo.remover(chave);
    expect(await repo.obterPorChave(chave)).toBeNull();
  });

  it("retorna null para chave inexistente", async () => {
    expect(await repo.obterPorChave("nao-existe")).toBeNull();
  });
});
