import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });
config();

const { Client } = pg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const requiredTables = [
  "brands",
  "cart_items",
  "categories",
  "order_items",
  "orders",
  "products",
  "profiles",
  "quote_requests"
];

const requiredEnums = {
  order_status: ["pending", "processing", "paid", "fulfilled", "cancelled"],
  payment_method: ["mpesa", "card"],
  product_condition: ["new", "refurbished"],
  profile_role: ["customer"],
  quote_status: ["new", "contacted", "closed"],
  stock_status: ["in_stock", "backorder", "out_of_stock"]
};

const requiredFunctions = ["set_updated_at", "handle_new_user"];
const requiredTriggers = ["products_set_updated_at", "cart_items_set_updated_at", "on_auth_user_created"];
const requiredIndexes = [
  "products_category_id_idx",
  "products_brand_id_idx",
  "products_featured_idx",
  "orders_user_id_idx",
  "order_items_order_id_idx",
  "cart_items_user_id_idx"
];

const requiredPolicies = [
  "Public can read categories",
  "Public can read brands",
  "Public can read products",
  "Customers read own profile",
  "Customers update own profile",
  "Customers insert own profile",
  "Customers read own orders",
  "Customers create own orders",
  "Customers update own pending orders",
  "Customers read own order items",
  "Customers create own order items",
  "Public can create quote requests",
  "Customers manage own cart"
];

const requiredSeedCounts = {
  categories: 6,
  brands: 10,
  products: 15
};

const client = new Client({
  connectionString,
  ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false }
});

function fail(message) {
  throw new Error(message);
}

function assertIncludes(actual, expected, label) {
  const missing = expected.filter((item) => !actual.includes(item));
  if (missing.length) {
    fail(`Missing ${label}: ${missing.join(", ")}`);
  }
}

await client.connect();

try {
  const tableResult = await client.query(
    "select table_name from information_schema.tables where table_schema = 'public'"
  );
  assertIncludes(tableResult.rows.map((row) => row.table_name), requiredTables, "tables");

  const rlsResult = await client.query(
    "select relname from pg_class join pg_namespace on pg_namespace.oid = pg_class.relnamespace where nspname = 'public' and relrowsecurity = true"
  );
  assertIncludes(rlsResult.rows.map((row) => row.relname), requiredTables, "RLS-enabled tables");

  const enumResult = await client.query(`
    select t.typname, e.enumlabel
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
    order by t.typname, e.enumsortorder
  `);
  for (const [enumName, labels] of Object.entries(requiredEnums)) {
    const actual = enumResult.rows.filter((row) => row.typname === enumName).map((row) => row.enumlabel);
    assertIncludes(actual, labels, `${enumName} enum labels`);
  }

  const functionResult = await client.query(`
    select proname
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where nspname = 'public'
  `);
  assertIncludes(functionResult.rows.map((row) => row.proname), requiredFunctions, "functions");

  const triggerResult = await client.query("select tgname from pg_trigger where not tgisinternal");
  assertIncludes(triggerResult.rows.map((row) => row.tgname), requiredTriggers, "triggers");

  const indexResult = await client.query(`
    select indexname
    from pg_indexes
    where schemaname = 'public'
  `);
  assertIncludes(indexResult.rows.map((row) => row.indexname), requiredIndexes, "indexes");

  const policyResult = await client.query("select policyname from pg_policies where schemaname = 'public'");
  assertIncludes(policyResult.rows.map((row) => row.policyname), requiredPolicies, "RLS policies");

  for (const [table, minimum] of Object.entries(requiredSeedCounts)) {
    const result = await client.query(`select count(*)::int as count from public.${table}`);
    if (result.rows[0].count < minimum) {
      fail(`Expected at least ${minimum} rows in ${table}, found ${result.rows[0].count}`);
    }
  }

  await client.query("select 1");
  console.log("Supabase database verification passed.");
} finally {
  await client.end();
}
