import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { normalizePostgresConnectionString } from "./postgres-url";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const rawConnectionString = process.env.POSTGRES_URL_NON_POOLING ?? process.env.DATABASE_URL;

if (!rawConnectionString) {
  throw new Error("POSTGRES_URL_NON_POOLING or DATABASE_URL is required to initialize Prisma.");
}

const connectionString = normalizePostgresConnectionString(rawConnectionString);

process.env.DATABASE_URL = connectionString;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
