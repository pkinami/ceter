import { config } from "dotenv";
import fs from "node:fs";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

const { Client } = pg;

const ADMIN_ROLES = new Set(["admin", "owner", "manager", "sales", "store"]);

function argValue(name) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);

  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0) return process.argv[index + 1];

  return undefined;
}

function required(name, value) {
  if (!value) throw new Error(`${name} is required`);
  return value;
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log("Usage: npm run setup:admin -- --email staff@example.com --password secret --name \"Staff Name\" --role owner");
  console.log("You can also set ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, and ADMIN_ROLE in the environment.");
  process.exit(0);
}

const email = required("ADMIN_EMAIL or --email", (process.env.ADMIN_EMAIL ?? argValue("email") ?? process.argv[2])?.trim().toLowerCase());
const password = required("ADMIN_PASSWORD or --password", process.env.ADMIN_PASSWORD ?? argValue("password") ?? process.argv[3]);
const fullName = (process.env.ADMIN_NAME ?? argValue("name") ?? process.argv[4] ?? "Ceter Administrator").trim();
const role = (process.env.ADMIN_ROLE ?? argValue("role") ?? "owner").trim().toLowerCase();

if (!ADMIN_ROLES.has(role)) {
  throw new Error(`ADMIN_ROLE must be one of: ${Array.from(ADMIN_ROLES).join(", ")}`);
}

const supabaseUrl = required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
const serviceRoleKey = required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
const connectionString = required("DATABASE_URL", process.env.DATABASE_URL);

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function findUserByEmail() {
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data?.users ?? [];
    const found = users.find((user) => user.email?.toLowerCase() === email);
    if (found) return found;
    if (users.length < perPage) return null;
    page += 1;
  }
}

async function ensureAuthUser() {
  const existing = await findUserByEmail();
  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: {
        ...(existing.user_metadata ?? {}),
        full_name: fullName
      }
    });
    if (error) throw error;
    return { user: data.user, created: false };
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName
    }
  });
  if (error) throw error;
  return { user: data.user, created: true };
}

function databaseConfig(url) {
  if (url.includes("localhost")) return { connectionString: url, ssl: false };
  const parsed = new URL(url);
  parsed.searchParams.delete("sslmode");
  const caPath = process.env.PGSSLROOTCERT || process.env.SUPABASE_DB_CA_CERT_PATH || "supabase/certs/supabase-prod-ca-2021.crt";
  const ca = fs.existsSync(caPath) ? fs.readFileSync(caPath, "utf8") : undefined;
  return {
    connectionString: parsed.toString(),
    ssl: ca ? { ca, rejectUnauthorized: true, servername: parsed.hostname } : { rejectUnauthorized: true, servername: parsed.hostname }
  };
}

const db = new Client(databaseConfig(connectionString));

await db.connect();

try {
  const { user, created } = await ensureAuthUser();
  if (!user?.id) throw new Error("Supabase did not return an auth user id");

  await db.query(
    `
      insert into public.profiles (id, full_name, email, role)
      values ($1, $2, $3, $4::public.profile_role)
      on conflict (id) do update
      set full_name = excluded.full_name,
          email = excluded.email,
          role = excluded.role
    `,
    [user.id, fullName, email, role]
  );

  console.log(`${created ? "Created" : "Updated"} admin account: ${email}`);
  console.log(`Role: ${role}`);
  console.log("You can sign in at /admin/login.");
} finally {
  await db.end();
}
