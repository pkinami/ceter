type EnvName = keyof NodeJS.ProcessEnv;

export function requiredEnv(name: EnvName, options: { fallback?: EnvName; format?: string } = {}) {
  const value = process.env[name]?.trim() || (options.fallback ? process.env[options.fallback]?.trim() : "");
  if (!value) {
    const fallback = options.fallback ? ` or ${options.fallback}` : "";
    const format = options.format ? ` Expected format: ${options.format}.` : "";
    throw new Error(`Missing required environment variable: ${name}${fallback}.${format}`);
  }
  return value;
}

export function requiredUrlEnv(name: EnvName, options: { fallback?: EnvName } = {}) {
  const value = requiredEnv(name, { ...options, format: "absolute URL" });
  try {
    return new URL(value).toString();
  } catch {
    throw new Error(`Invalid environment variable: ${name} must be an absolute URL.`);
  }
}

export function requiredDatabaseUrl() {
  return requiredEnv("DATABASE_URL", {
    fallback: "POSTGRES_URL_NON_POOLING",
    format: "postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
  });
}
