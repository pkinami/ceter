export function normalizePostgresConnectionString(connectionString: string) {
  let url: URL;

  try {
    url = new URL(connectionString);
  } catch {
    return connectionString;
  }

  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    return connectionString;
  }

  const host = url.hostname.toLowerCase();
  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".localhost");

  if (isLocal || url.searchParams.has("sslrootcert")) {
    return connectionString;
  }

  const sslMode = url.searchParams.get("sslmode");
  if ((sslMode === "require" || sslMode === "prefer") && !url.searchParams.has("uselibpqcompat")) {
    url.searchParams.set("uselibpqcompat", "true");
    return url.toString();
  }

  return connectionString;
}
