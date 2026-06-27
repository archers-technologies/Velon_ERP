import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { prisma } from "@velon/database";

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly client = prisma;

  async onModuleInit() {
    try {
      await this.client.$connect();
    } catch (error) {
      // Do not crash process startup if DB is briefly unavailable on platform boot.
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Prisma initial connect failed: ${message}`);
    }
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
