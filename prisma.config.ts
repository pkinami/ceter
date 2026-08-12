import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";
import { normalizePostgresConnectionString } from "./lib/postgres-url";

if (!process.env.VERCEL) {
  loadEnv({ path: ".env.local", quiet: true });
}

const databaseUrl =
  process.env.POSTGRES_URL_NON_POOLING?.trim() || process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  throw new Error("POSTGRES_URL_NON_POOLING or DATABASE_URL is required for Prisma.");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: normalizePostgresConnectionString(databaseUrl)
  }
});
