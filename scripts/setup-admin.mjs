import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });
config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.ADMIN_EMAIL;
const fullName = process.env.ADMIN_NAME;
const password = process.env.ADMIN_PASSWORD;

function requireEnv(name, value) {
  if (!value) {
    throw new Error(`${name} is required`);
  }
}

requireEnv("NEXT_PUBLIC_SUPABASE_URL", url);
requireEnv("SUPABASE_SERVICE_ROLE_KEY", serviceRoleKey);
requireEnv("ADMIN_EMAIL", email);
requireEnv("ADMIN_NAME", fullName);
requireEnv("ADMIN_PASSWORD", password);

const supabase = createClient(url, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function findUserByEmail(targetEmail) {
  const normalized = targetEmail.toLowerCase();
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data?.users ?? [];
    const found = users.find((user) => user.email?.toLowerCase() === normalized);
    if (found) return found;
    if (users.length < perPage) return null;
    page += 1;
  }
}

async function ensureAuthUser() {
  const existing = await findUserByEmail(email);
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
    return data.user;
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
  return data.user;
}

const user = await ensureAuthUser();
if (!user?.id) {
  throw new Error("Supabase Admin API did not return a user id");
}

const { error: profileError } = await supabase
  .from("profiles")
  .upsert(
    {
      id: user.id,
      full_name: fullName,
      role: "admin"
    },
    { onConflict: "id" }
  );

if (profileError) throw profileError;

console.log(`Admin user ready: ${email}`);
