import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";
import { drizzle as drizzleExpo } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";
import * as schema from "./schema";

/**
 * Tipo driver-agnóstico do banco Drizzle usado pela camada `data`. O mesmo
 * schema (`./schema.ts`, `sqlite-core`) roda sobre dois drivers diferentes:
 *
 * - `drizzle-orm/expo-sqlite` em runtime real (iOS/Android via JSI).
 * - `drizzle-orm/better-sqlite3` em teste (Jest não tem o binding nativo do
 *   `expo-sqlite` — ver `src/data/local/db/testClient.ts`).
 *
 * Repositórios em `src/data/repositories` recebem esse tipo por injeção
 * (nunca importam um driver concreto), o que permite testá-los com SQLite em
 * memória sem depender de simulador/dispositivo.
 */
export type AppDatabase = BaseSQLiteDatabase<"sync", unknown, typeof schema>;

const DATABASE_NAME = "jujuba.db";

/**
 * Cria a conexão real (`expo-sqlite`) usada em runtime pelo app. Não chamar
 * em ambiente de teste (Jest) — o binding nativo não existe fora do
 * simulador/dispositivo.
 */
export function createAppDatabase(): AppDatabase {
  const client = openDatabaseSync(DATABASE_NAME);
  return drizzleExpo(client, { schema }) as unknown as AppDatabase;
}

export { schema };
