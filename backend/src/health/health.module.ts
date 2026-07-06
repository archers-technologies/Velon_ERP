import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { HealthController } from './health.controller';

@Module({
  imports: [PrismaModule, RedisModule, EmailModule],
  controllers: [HealthController],
})
export class HealthModule {}
