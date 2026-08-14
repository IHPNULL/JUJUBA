import path from "node:path";
import Database from "better-sqlite3";
import { drizzle as drizzleBetterSqlite3 } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import type { AppDatabase } from "./client";
import * as schema from "./schema";

/**
 * Banco em memória (`:memory:`, `better-sqlite3`) usado só em teste (Jest).
 * `expo-sqlite` não tem binding nativo fora de simulador/dispositivo, então
 * testes de repositório sobem o MESMO schema Drizzle (`./schema.ts`) sobre
 * esse driver Node-nativo em vez do driver real (`./client.ts`).
 *
 * As migrações aplicadas são as mesmas geradas por `drizzle-kit generate`
 * (`./migrations/`) a partir do schema real — nada é duplicado à mão, então
 * schema de teste e schema de produção não podem divergir silenciosamente.
 */
export function createTestDatabase(): AppDatabase {
  const client = new Database(":memory:");
  const db = drizzleBetterSqlite3(client, { schema });
  migrate(db, { migrationsFolder: path.join(__dirname, "migrations") });
  return db as unknown as AppDatabase;
}
