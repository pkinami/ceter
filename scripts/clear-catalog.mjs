import fs from "node:fs";
import process from "node:process";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import pg from "pg";

const CONFIRMATION = "CLEAR PRODUCT CATALOG";

loadLocalEnv();

const connectionString = normalizePostgresConnectionString(
  process.env.POSTGRES_URL_NON_POOLING?.trim() || process.env.DATABASE_URL?.trim() || ""
);

if (!connectionString) {
  console.error("POSTGRES_URL_NON_POOLING or DATABASE_URL is required.");
  process.exit(1);
}

const confirmed = await confirmDestructiveAction();
if (!confirmed) {
  console.log("Catalog cleanup cancelled. No data was changed.");
  process.exit(0);
}

const client = new pg.Client({ connectionString });

try {
  await client.connect();
  await client.query("begin");

  const before = await countTables(client);

  const updates = {
    order_items_unlinked: await updateCount(client, "update public.order_items set product_id = null where product_id is not null"),
    quote_lines_unlinked: await updateCount(client, "update public.quote_lines set product_id = null where product_id is not null")
  };

  const deleted = {};
  for (const table of [
    "cart_items",
    "product_compatibilities",
    "enrichment_jobs",
    "product_serials",
    "stock_movements",
    "price_history",
    "products"
  ]) {
    deleted[table] = await deleteCount(client, `delete from public.${table}`);
  }

  const after = await countTables(client);

  if (after.products !== 0) {
    throw new Error(`Catalog cleanup verification failed: products=${after.products}`);
  }
  if (before.categories !== after.categories || before.brands !== after.brands) {
    throw new Error(
      `Catalog cleanup verification failed: categories ${before.categories}->${after.categories}, brands ${before.brands}->${after.brands}`
    );
  }

  await client.query("commit");

  console.log("Catalog cleanup complete.");
  console.table({ before, after });
  console.log("Historical references preserved by unlinking product_id:");
  console.table(updates);
  console.log("Deleted product-bound records:");
  console.table(deleted);
} catch (error) {
  await client.query("rollback").catch(() => {});
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}

async function confirmDestructiveAction() {
  console.log("This will permanently delete all products and product-bound operational records.");
  console.log("Preserved: categories, category hierarchy, brands, profiles/auth, orders, payments, settings, banners, homepage configuration.");
  console.log(`Type "${CONFIRMATION}" to continue.`);

  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question("> ");
    return answer.trim() === CONFIRMATION;
  } finally {
    rl.close();
  }
}

async function countTables(client) {
  const result = await client.query(`
    select
      (select count(*)::int from public.products) as products,
      (select count(*)::int from public.categories) as categories,
      (select count(*)::int from public.brands) as brands
  `);
  return result.rows[0];
}

async function deleteCount(client, sql) {
  const result = await client.query(sql);
  return result.rowCount ?? 0;
}

async function updateCount(client, sql) {
  const result = await client.query(sql);
  return result.rowCount ?? 0;
}

function loadLocalEnv() {
  if (process.env.VERCEL || !fs.existsSync(".env.local")) return;
  const contents = fs.readFileSync(".env.local", "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    if (!key || process.env[key]) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
}

function normalizePostgresConnectionString(value) {
  if (!value) return value;

  let url;
  try {
    url = new URL(value);
  } catch {
    return value;
  }

  if (!["postgres:", "postgresql:"].includes(url.protocol)) return value;

  const host = url.hostname.toLowerCase();
  const isLocal = host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".localhost");

  if (isLocal || url.searchParams.has("sslrootcert")) return value;

  const sslMode = url.searchParams.get("sslmode");
  if ((sslMode === "require" || sslMode === "prefer") && !url.searchParams.has("uselibpqcompat")) {
    url.searchParams.set("uselibpqcompat", "true");
    return url.toString();
  }

  return value;
}
