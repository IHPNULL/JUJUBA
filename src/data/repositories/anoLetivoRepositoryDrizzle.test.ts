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
import { AnoLetivoRepositoryDrizzle } from "./anoLetivoRepositoryDrizzle";
import type { AnoLetivo } from "../../domain/entities/anoLetivo";

function novoAnoLetivo(overrides: Partial<AnoLetivo> = {}): AnoLetivo {
  return {
    id: "ano-2026",
    rotulo: "2026",
    escola: "Escola Teste",
    serie: "9º ano",
    inicio: "2026-02-01",
    fim: "2026-12-15",
    formulaSpecId: "spec-padrao",
    ativo: true,
    ...overrides,
  };
}

describe("AnoLetivoRepositoryDrizzle", () => {
  let db: AppDatabase;
  let repo: AnoLetivoRepositoryDrizzle;

  beforeEach(() => {
    db = createTestDatabase();
    repo = new AnoLetivoRepositoryDrizzle(db);
  });

  it("cria e lê de volta um ano letivo", async () => {
    await repo.criar(novoAnoLetivo());
    const lido = await repo.obterPorId("ano-2026");
    expect(lido).toEqual(novoAnoLetivo());
  });

  it("retorna null quando não encontra", async () => {
    expect(await repo.obterPorId("inexistente")).toBeNull();
  });

  it("atualiza campos", async () => {
    await repo.criar(novoAnoLetivo());
    await repo.atualizar(novoAnoLetivo({ escola: "Nova Escola" }));
    const lido = await repo.obterPorId("ano-2026");
    expect(lido?.escola).toBe("Nova Escola");
  });

  it("remove", async () => {
    await repo.criar(novoAnoLetivo());
    await repo.remover("ano-2026");
    expect(await repo.obterPorId("ano-2026")).toBeNull();
  });

  it("lista todos", async () => {
    await repo.criar(novoAnoLetivo({ id: "ano-2025", rotulo: "2025", ativo: false }));
    await repo.criar(novoAnoLetivo());
    const todos = await repo.listarTodos();
    expect(todos).toHaveLength(2);
  });

  it("obtém o ano letivo ativo", async () => {
    await repo.criar(novoAnoLetivo({ id: "ano-2025", rotulo: "2025", ativo: false }));
    await repo.criar(novoAnoLetivo());
    const ativo = await repo.obterAtivo();
    expect(ativo?.id).toBe("ano-2026");
  });
});
