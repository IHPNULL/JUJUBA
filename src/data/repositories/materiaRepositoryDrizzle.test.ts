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
import { MateriaRepositoryDrizzle } from "./materiaRepositoryDrizzle";
import type { AnoLetivo } from "../../domain/entities/anoLetivo";
import type { Materia } from "../../domain/entities/materia";

function novoAnoLetivo(): AnoLetivo {
  return {
    id: "ano-2026",
    rotulo: "2026",
    escola: null,
    serie: null,
    inicio: "2026-02-01",
    fim: "2026-12-15",
    formulaSpecId: "spec-padrao",
    ativo: true,
  };
}

function novaMateria(overrides: Partial<Materia> = {}): Materia {
  return {
    id: "materia-matematica",
    anoLetivoId: "ano-2026",
    nome: "Matemática",
    professor: "Prof. Ana",
    cor: "#2563eb",
    cargaHoraria: 80,
    formulaSpecIdOverride: null,
    arquivada: false,
    ...overrides,
  };
}

describe("MateriaRepositoryDrizzle", () => {
  let db: AppDatabase;
  let materiaRepo: MateriaRepositoryDrizzle;

  beforeEach(async () => {
    db = createTestDatabase();
    await new AnoLetivoRepositoryDrizzle(db).criar(novoAnoLetivo());
    materiaRepo = new MateriaRepositoryDrizzle(db);
  });

  it("cria uma matéria e lê de volta", async () => {
    await materiaRepo.criar(novaMateria());
    const lida = await materiaRepo.obterPorId("materia-matematica");
    expect(lida).toEqual(novaMateria());
  });

  it("lista matérias do ano letivo excluindo arquivadas por padrão", async () => {
    await materiaRepo.criar(novaMateria());
    await materiaRepo.criar(novaMateria({ id: "materia-historia", nome: "História", arquivada: true }));

    const ativas = await materiaRepo.listarPorAnoLetivo("ano-2026");
    expect(ativas.map((m) => m.id)).toEqual(["materia-matematica"]);

    const todas = await materiaRepo.listarPorAnoLetivo("ano-2026", { incluirArquivadas: true });
    expect(todas).toHaveLength(2);
  });

  it("arquiva uma matéria", async () => {
    await materiaRepo.criar(novaMateria());
    await materiaRepo.arquivar("materia-matematica");
    const lida = await materiaRepo.obterPorId("materia-matematica");
    expect(lida?.arquivada).toBe(true);
  });
});
