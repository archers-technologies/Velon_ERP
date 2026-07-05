function read(name: string): string | undefined {
  const value = process.env[name];
  return value?.trim() || undefined;
}

export function isMongoEnabled(): boolean {
  return read('MONGODB_ENABLED')?.toLowerCase() === 'true';
}

export function getMongoDatabaseName(): string {
  return read('MONGODB_DATABASE') ?? 'velon_erp';
}

export function validateMongoEnvironment(config: Record<string, unknown>): void {
  const enabled =
    String(config.MONGODB_ENABLED ?? '')
      .trim()
      .toLowerCase() === 'true';
  if (!enabled) return;

  const uri = String(config.MONGODB_URI ?? '').trim();
  if (!uri) {
    throw new Error(
      'MONGODB_ENABLED=true but MONGODB_URI is missing. Set MONGODB_URI or disable MongoDB with MONGODB_ENABLED=false.',
    );
  }
}

export type MongoConnectionConfig = {
  uri: string;
  database: string;
};

export function getMongoConnectionConfig(): MongoConnectionConfig | null {
  if (!isMongoEnabled()) return null;

  const uri = read('MONGODB_URI');
  if (!uri) {
    throw new Error(
      'MONGODB_ENABLED=true but MONGODB_URI is missing. Set MONGODB_URI or disable MongoDB with MONGODB_ENABLED=false.',
    );
  }

  return {
    uri,
    database: getMongoDatabaseName(),
  };
}
