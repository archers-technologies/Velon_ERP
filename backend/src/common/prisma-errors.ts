import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@velon/database';

export function rethrowPrismaAsBadRequest(err: unknown, fallback: string): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : 'unique field';
      throw new BadRequestException(`A record with this ${target} already exists.`);
    }
    if (err.code === 'P2003') {
      throw new BadRequestException('Referenced record was not found.');
    }
  }
  if (err instanceof BadRequestException) {
    throw err;
  }
  throw new BadRequestException(fallback);
}
