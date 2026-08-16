import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import type { ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";
import { createAppDatabase, type AppDatabase } from "./client";
import migrations from "./migrations/migrations";
import * as schema from "./schema";

/**
 * Singleton preguiçoso do banco real (`expo-sqlite`) e das migrações — só é
 * tocado pelo composition root (`app/_layout.tsx`), nunca por teste. Testes
 * usam `createTestDatabase()` (`./testClient.ts`) via injeção, como qualquer
 * repositório em `src/data/repositories`.
 */

let bancoInstancia: AppDatabase | null = null;
let migracoesPromise: Promise<void> | null = null;

export function obterBancoDeDados(): AppDatabase {
  if (!bancoInstancia) bancoInstancia = createAppDatabase();
  return bancoInstancia;
}

/** Aplica migrações pendentes uma única vez por processo (`openDatabaseSync` não pode reabrir o arquivo). */
export function obterMigracoesProntas(): Promise<void> {
  if (!migracoesPromise) {
    migracoesPromise = migrate(obterBancoDeDados() as unknown as ExpoSQLiteDatabase<typeof schema>, migrations);
  }
  return migracoesPromise;
}
