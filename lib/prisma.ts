import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { PoolConfig } from "pg";
import { normalizePostgresConnectionString } from "./postgres-url";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const rawConnectionString = process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL_NON_POOLING?.trim();

if (!rawConnectionString) {
  throw new Error("DATABASE_URL or POSTGRES_URL_NON_POOLING is required to initialize Prisma.");
}

const connectionString = normalizePostgresConnectionString(toSupabaseTransactionPooler(rawConnectionString));
const poolMax = toPositiveInteger(process.env.PRISMA_POOL_MAX, process.env.NODE_ENV === "production" ? 1 : 5);
const poolConfig: PoolConfig = {
  connectionString,
  max: poolMax,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000
};

process.env.DATABASE_URL = connectionString;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg(poolConfig),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

function toPositiveInteger(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toSupabaseTransactionPooler(value: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return value;
  }

  if (!["postgres:", "postgresql:"].includes(url.protocol)) return value;
  if (!url.hostname.toLowerCase().endsWith(".pooler.supabase.com")) return value;
  if (url.port !== "5432") return value;

  url.port = "6543";
  url.searchParams.set("pgbouncer", "true");
  return url.toString();
}
