import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { json, urlencoded, type Request } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { formatSmtpConfigForLog, smtpConfigured } from './common/mail-delivery.util';
import { isCorsOriginAllowed } from './config/env';

type RawBodyRequest = Request & { rawBody?: Buffer };

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bodyParser: false,
  });

  app.use(
    json({
      limit: '2mb',
      verify: (req, _res, buf) => {
        (req as RawBodyRequest).rawBody = buf;
      },
    }),
  );
  app.use(urlencoded({ limit: '2mb', extended: true }));

  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (isCorsOriginAllowed(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swagger = new DocumentBuilder()
    .setTitle('Velon ERP API')
    .setDescription('Production API for multi-tenant Velon ERP platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger));

  const port = Number(process.env.PORT || process.env.API_PORT || 3001);
  await app.listen(port, '0.0.0.0');
  console.log(`Velon API listening on 0.0.0.0:${port}`);
  console.log(`Swagger: /api/docs`);
  console.log(formatSmtpConfigForLog());
  console.log(`SMTP configured: ${smtpConfigured() ? 'yes' : 'no'}`);
}

bootstrap();
