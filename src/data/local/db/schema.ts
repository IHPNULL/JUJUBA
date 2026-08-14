import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/**
 * Schema Drizzle sobre expo-sqlite. Espelha o modelo de domínio em
 * docs/ARQUITETURA.md §5. Notas nunca em ponto flutuante nativo: gravadas
 * como inteiro escalado (`valorMilis`), nunca `REAL`.
 */

export const anoLetivo = sqliteTable("ano_letivo", {
  id: text("id").primaryKey(),
  rotulo: text("rotulo").notNull(),
  escola: text("escola"),
  serie: text("serie"),
  inicio: text("inicio").notNull(),
  fim: text("fim").notNull(),
  formulaSpecId: text("formula_spec_id").notNull(),
  ativo: integer("ativo", { mode: "boolean" }).notNull().default(true),
});

export const periodo = sqliteTable("periodo", {
  id: text("id").primaryKey(),
  anoLetivoId: text("ano_letivo_id")
    .notNull()
    .references(() => anoLetivo.id),
  ordem: integer("ordem").notNull(),
  nome: text("nome").notNull(),
  inicio: text("inicio"),
  fim: text("fim"),
});

export const materia = sqliteTable("materia", {
  id: text("id").primaryKey(),
  anoLetivoId: text("ano_letivo_id")
    .notNull()
    .references(() => anoLetivo.id),
  nome: text("nome").notNull(),
  professor: text("professor"),
  cor: text("cor"),
  cargaHoraria: integer("carga_horaria"),
  formulaSpecIdOverride: text("formula_spec_id_override"),
  arquivada: integer("arquivada", { mode: "boolean" }).notNull().default(false),
});

export const avaliacao = sqliteTable("avaliacao", {
  id: text("id").primaryKey(),
  materiaId: text("materia_id")
    .notNull()
    .references(() => materia.id),
  periodoId: text("periodo_id")
    .notNull()
    .references(() => periodo.id),
  titulo: text("titulo").notNull(),
  tipoId: text("tipo_id").notNull(),
  peso: integer("peso").notNull(),
  notaMaximaMilis: integer("nota_maxima_milis").notNull(),
  data: text("data"),
  obrigatoria: integer("obrigatoria", { mode: "boolean" }).notNull().default(false),
});

/** `valorMilis`: 8.75 → 8750. Nunca REAL — ver ADR 0004 e docs/TECNOLOGIAS.md §2. */
export const nota = sqliteTable("nota", {
  id: text("id").primaryKey(),
  avaliacaoId: text("avaliacao_id")
    .notNull()
    .references(() => avaliacao.id),
  valorMilis: integer("valor_milis").notNull(),
  origem: text("origem", { enum: ["real", "simulada"] }).notNull(),
  atualizadoEm: text("atualizado_em").notNull(),
});

export const prospecto = sqliteTable("prospecto", {
  id: text("id").primaryKey(),
  anoLetivoId: text("ano_letivo_id")
    .notNull()
    .references(() => anoLetivo.id),
  titulo: text("titulo").notNull(),
  caminhoRelativo: text("caminho_relativo").notNull(),
  mimeType: text("mime_type").notNull(),
  tamanho: integer("tamanho").notNull(),
  hash: text("hash").notNull(),
  importadoEm: text("importado_em").notNull(),
});

export const rascunho = sqliteTable("rascunho", {
  chave: text("chave").primaryKey(),
  payloadJson: text("payload_json").notNull(),
  atualizadoEm: text("atualizado_em").notNull(),
});
