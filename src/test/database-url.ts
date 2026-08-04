type TestDatabaseUrlOptions = {
  database?: string;
  hostname?: string;
  password?: string;
  port?: number;
  protocol?: "http" | "postgres" | "postgresql";
  sslmode?: "require";
  username?: string;
};

export function createTestDatabaseUrl({
  database = "postgres",
  hostname = "127.0.0.1",
  password = "postgres",
  port = 54322,
  protocol = "postgresql",
  sslmode,
  username = "postgres",
}: TestDatabaseUrlOptions = {}): string {
  const credentials = `${encodeURIComponent(username)}:${encodeURIComponent(password)}`;
  const query = sslmode ? `?sslmode=${sslmode}` : "";

  return `${protocol}://${credentials}@${hostname}:${port}/${database}${query}`;
}
