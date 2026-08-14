import { createTestDatabase } from "../local/db/testClient";
import type { AppDatabase } from "../local/db/client";
import { AnoLetivoRepositoryDrizzle } from "./anoLetivoRepositoryDrizzle";
import { MateriaRepositoryDrizzle } from "./materiaRepositoryDrizzle";
import { FrenteRepositoryDrizzle } from "./frenteRepositoryDrizzle";
import type { AnoLetivo } from "../../domain/entities/anoLetivo";
import type { Materia } from "../../domain/entities/materia";
import type { Frente } from "../../domain/entities/frente";

function novoAnoLetivo(): AnoLetivo {
  return {
    id: "ano-2026",
    rotulo: "2026",
    escola: null,
    serie: null,
    inicio: "2026-02-01",
    fim: "2026-12-15",
    formulaSpecId: "real-trimestral-v1",
    ativo: true,
  };
}

function novaMateria(): Materia {
  return {
    id: "materia-fisica",
    anoLetivoId: "ano-2026",
    nome: "Física",
    professor: null,
    cor: "#8B5FBF",
    cargaHoraria: null,
    formulaSpecIdOverride: null,
    arquivada: false,
  };
}

function novaFrente(overrides: Partial<Frente> = {}): Frente {
  return {
    id: "frente-1",
    materiaId: "materia-fisica",
    ordem: 1,
    nome: "Frente 1",
    ...overrides,
  };
}

describe("FrenteRepositoryDrizzle", () => {
  let db: AppDatabase;
  let frenteRepo: FrenteRepositoryDrizzle;

  beforeEach(async () => {
    db = createTestDatabase();
    await new AnoLetivoRepositoryDrizzle(db).criar(novoAnoLetivo());
    await new MateriaRepositoryDrizzle(db).criar(novaMateria());
    frenteRepo = new FrenteRepositoryDrizzle(db);
  });

  it("cria uma frente e lista por matéria", async () => {
    await frenteRepo.criar(novaFrente());
    const frentes = await frenteRepo.listarPorMateria("materia-fisica");
    expect(frentes).toEqual([novaFrente()]);
  });

  it("suporta duas frentes na mesma matéria, ordenáveis por 'ordem'", async () => {
    await frenteRepo.criar(novaFrente({ id: "frente-1", ordem: 1, nome: "Frente 1" }));
    await frenteRepo.criar(novaFrente({ id: "frente-2", ordem: 2, nome: "Frente 2" }));
    const frentes = await frenteRepo.listarPorMateria("materia-fisica");
    expect(frentes.map((f) => f.nome).sort()).toEqual(["Frente 1", "Frente 2"]);
  });
});
