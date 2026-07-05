import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Db, MongoClient } from 'mongodb';
import { getMongoConnectionConfig, isMongoEnabled } from './mongo.config';

@Injectable()
export class MongoService implements OnModuleInit, OnModuleDestroy {
  private client: MongoClient | null = null;
  private database: Db | null = null;

  get enabled(): boolean {
    return isMongoEnabled();
  }

  /** Connected database when MongoDB is enabled; otherwise null. */
  get db(): Db | null {
    return this.database;
  }

  async onModuleInit() {
    const config = getMongoConnectionConfig();
    if (!config) return;

    this.client = new MongoClient(config.uri);
    await this.client.connect();
    this.database = this.client.db(config.database);
  }

  async onModuleDestroy() {
    if (!this.client) return;
    await this.client.close();
    this.client = null;
    this.database = null;
  }

  async ping(): Promise<boolean> {
    if (!this.database) return false;
    try {
      await this.database.command({ ping: 1 });
      return true;
    } catch {
      return false;
    }
  }
}
