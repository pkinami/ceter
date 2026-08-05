import { existsSync } from "node:fs";
import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";
import { normalizePostgresConnectionString } from "./lib/postgres-url";

if (existsSync(".env.local")) {
  config({ path: ".env.local" });
} else if (existsSync(".env")) {
  config();
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: normalizePostgresConnectionString(env("POSTGRES_URL_NON_POOLING"))
  }
});
