import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { formatSmtpConfigForLog, smtpConfigured } from "./common/mail-delivery.util";
import { getApiPort, isCorsOriginAllowed } from "./config/env";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

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
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swagger = new DocumentBuilder()
    .setTitle("Velon ERP API")
    .setDescription("Production API for multi-tenant Velon ERP platform")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  SwaggerModule.setup("api/docs", app, SwaggerModule.createDocument(app, swagger));

  const port = getApiPort();
  await app.listen(port, "0.0.0.0");
  console.log(`Velon API listening on 0.0.0.0:${port}`);
  console.log(`Swagger: /api/docs`);
  console.log(formatSmtpConfigForLog());
  console.log(`SMTP configured: ${smtpConfigured() ? "yes" : "no"}`);
}

bootstrap();
