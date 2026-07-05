import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class VelonLogger {
  private readonly logger = new Logger('VelonAPI');

  auth(event: string, meta?: Record<string, unknown>) {
    this.logger.log(JSON.stringify({ category: 'auth', event, ...meta }));
  }

  authFailure(event: string, meta?: Record<string, unknown>) {
    this.logger.warn(JSON.stringify({ category: 'auth', event, success: false, ...meta }));
  }

  dbFailure(operation: string, err: unknown, meta?: Record<string, unknown>) {
    const message = err instanceof Error ? err.message : String(err);
    this.logger.error(
      JSON.stringify({ category: 'database', operation, success: false, error: message, ...meta }),
    );
  }

  apiFailure(path: string, err: unknown, meta?: Record<string, unknown>) {
    const message = err instanceof Error ? err.message : String(err);
    this.logger.error(
      JSON.stringify({ category: 'api', path, success: false, error: message, ...meta }),
    );
  }
}
