import { config } from 'dotenv';
import path from 'node:path';

// Single source of truth for env vars is the monorepo root .env.
config({ path: path.resolve(__dirname, '../../../.env') });

import cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });
  await app.listen(process.env.API_PORT ?? 4000);
}
void bootstrap();
