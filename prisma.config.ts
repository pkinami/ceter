import { existsSync } from "node:fs";
import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

if (existsSync(".env.local")) {
  config({ path: ".env.local" });
} else if (existsSync(".env")) {
  config();
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("POSTGRES_URL_NON_POOLING")
  }
});