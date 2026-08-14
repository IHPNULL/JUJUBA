import type { Config } from "drizzle-kit";

export default {
  schema: "./src/data/local/db/schema.ts",
  out: "./src/data/local/db/migrations",
  dialect: "sqlite",
  driver: "expo",
} satisfies Config;
