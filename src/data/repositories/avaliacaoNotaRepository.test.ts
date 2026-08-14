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
import Decimal from "decimal.js";
import { createTestDatabase } from "../local/db/testClient";
import type { AppDatabase } from "../local/db/client";
import { AnoLetivoRepositoryDrizzle } from "./anoLetivoRepositoryDrizzle";
import { PeriodoRepositoryDrizzle } from "./periodoRepositoryDrizzle";
import { MateriaRepositoryDrizzle } from "./materiaRepositoryDrizzle";
import { FrenteRepositoryDrizzle } from "./frenteRepositoryDrizzle";
import { AvaliacaoRepositoryDrizzle } from "./avaliacaoRepositoryDrizzle";
import { NotaRepositoryDrizzle } from "./notaRepositoryDrizzle";
import { nota as notaTable } from "../local/db/schema";
import type { Avaliacao } from "../../domain/entities/avaliacao";
import type { Nota } from "../../domain/entities/nota";

/**
 * Cobre o caminho crítico descrito na tarefa: criar matéria, avaliação e
 * nota, e ler de volta com o valor batendo exatamente via `Decimal`,
 * incluindo o round-trip pelo inteiro escalado `valorMilis` (8.75 → 8750 →
 * 8.75). Esse é o único ponto do sistema onde uma divergência silenciosa de
 * arredondamento significaria dizer ao aluno que ele passou quando não
 * passou (docs/ARQUITETURA.md §10).
 */
describe("Avaliação + Nota (Drizzle)", () => {
  let db: AppDatabase;
  let avaliacaoRepo: AvaliacaoRepositoryDrizzle;
  let notaRepo: NotaRepositoryDrizzle;

  beforeEach(async () => {
    db = createTestDatabase();

    await new AnoLetivoRepositoryDrizzle(db).criar({
      id: "ano-2026",
      rotulo: "2026",
      escola: null,
      serie: null,
      inicio: "2026-02-01",
      fim: "2026-12-15",
      formulaSpecId: "spec-padrao",
      ativo: true,
    });

    await new PeriodoRepositoryDrizzle(db).criar({
      id: "periodo-1",
      anoLetivoId: "ano-2026",
      ordem: 1,
      nome: "1º Bimestre",
      inicio: "2026-02-01",
      fim: "2026-04-15",
    });

    await new MateriaRepositoryDrizzle(db).criar({
      id: "materia-matematica",
      anoLetivoId: "ano-2026",
      nome: "Matemática",
      professor: null,
      cor: null,
      cargaHoraria: null,
      formulaSpecIdOverride: null,
      arquivada: false,
    });

    await new FrenteRepositoryDrizzle(db).criar({
      id: "frente-1",
      materiaId: "materia-matematica",
      ordem: 1,
      nome: "Única",
    });

    avaliacaoRepo = new AvaliacaoRepositoryDrizzle(db);
    notaRepo = new NotaRepositoryDrizzle(db);
  });

  function novaAvaliacao(overrides: Partial<Avaliacao> = {}): Avaliacao {
    return {
      id: "avaliacao-prova-1",
      materiaId: "materia-matematica",
      frenteId: "frente-1",
      periodoId: "periodo-1",
      titulo: "Prova 1",
      tipoId: "prova",
      peso: 1,
      notaMaxima: new Decimal(10),
      data: "2026-03-10",
      obrigatoria: true,
      ...overrides,
    };
  }

  it("cria uma avaliação e lê de volta com notaMaxima como Decimal", async () => {
    await avaliacaoRepo.criar(novaAvaliacao());
    const lida = await avaliacaoRepo.obterPorId("avaliacao-prova-1");

    expect(lida).not.toBeNull();
    expect(lida?.notaMaxima).toBeInstanceOf(Decimal);
    expect(lida?.notaMaxima.equals(new Decimal(10))).toBe(true);
  });

  it("grava 8.75 como valorMilis=8750 e lê de volta um Decimal igual a 8.75", async () => {
    await avaliacaoRepo.criar(novaAvaliacao());

    const notaEntidade: Nota = {
      id: "nota-1",
      avaliacaoId: "avaliacao-prova-1",
      valor: new Decimal("8.75"),
      origem: "real",
      atualizadoEm: "2026-03-11T10:00:00.000Z",
    };
    await notaRepo.criar(notaEntidade);

    // Confere a linha crua no banco: valor_milis tem que ser exatamente 8750,
    // nunca ponto flutuante.
    const linhasCruas = await db.select().from(notaTable);
    expect(linhasCruas).toHaveLength(1);
    expect(linhasCruas[0].valorMilis).toBe(8750);
    expect(Number.isInteger(linhasCruas[0].valorMilis)).toBe(true);

    const lida = await notaRepo.obterPorId("nota-1");
    expect(lida?.valor).toBeInstanceOf(Decimal);
    expect(lida?.valor.equals(new Decimal("8.75"))).toBe(true);
    expect(lida?.valor.toString()).toBe("8.75");
  });

  it("round-trip de nota preserva precisão decimal para valores com 2 casas (não half_up silencioso)", async () => {
    await avaliacaoRepo.criar(novaAvaliacao());

    const casos = ["10", "0", "6.66", "9.99", "5.05", "7.5"];
    for (const [indice, valor] of casos.entries()) {
      await notaRepo.criar({
        id: `nota-${indice}`,
        avaliacaoId: "avaliacao-prova-1",
        valor: new Decimal(valor),
        origem: "real",
        atualizadoEm: "2026-03-11T10:00:00.000Z",
      });
    }

    for (const [indice, valor] of casos.entries()) {
      const lida = await notaRepo.obterPorId(`nota-${indice}`);
      expect(lida?.valor.equals(new Decimal(valor))).toBe(true);
    }
  });

  it("lista avaliações com notas por matéria e período (tela Matéria)", async () => {
    await avaliacaoRepo.criar(novaAvaliacao());
    await avaliacaoRepo.criar(
      novaAvaliacao({ id: "avaliacao-trabalho-1", titulo: "Trabalho 1", tipoId: "trabalho" }),
    );

    await notaRepo.criar({
      id: "nota-1",
      avaliacaoId: "avaliacao-prova-1",
      valor: new Decimal("8.75"),
      origem: "real",
      atualizadoEm: "2026-03-11T10:00:00.000Z",
    });
    await notaRepo.criar({
      id: "nota-1-simulada",
      avaliacaoId: "avaliacao-prova-1",
      valor: new Decimal("10"),
      origem: "simulada",
      atualizadoEm: "2026-03-12T10:00:00.000Z",
    });

    const resultado = await avaliacaoRepo.listarComNotasPorMateriaEPeriodo(
      "materia-matematica",
      "periodo-1",
    );

    expect(resultado).toHaveLength(2);

    const comProva = resultado.find((item) => item.avaliacao.id === "avaliacao-prova-1");
    expect(comProva?.notas).toHaveLength(2);
    expect(comProva?.notas.map((n) => n.origem).sort()).toEqual(["real", "simulada"]);

    const comTrabalho = resultado.find((item) => item.avaliacao.id === "avaliacao-trabalho-1");
    expect(comTrabalho?.notas).toHaveLength(0);
  });

  it("listarPorAvaliacoes retorna vazio para lista vazia sem consultar o banco", async () => {
    expect(await notaRepo.listarPorAvaliacoes([])).toEqual([]);
  });
});
