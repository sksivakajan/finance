import { config } from 'dotenv';
import path from 'node:path';

// Single source of truth for env vars is the monorepo root .env.
config({ path: path.resolve(__dirname, '../../../.env') });

import cookieParser from 'cookie-parser';
import type { Express } from 'express';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { EnvService } from './config/env.service.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const env = app.get(EnvService).values;
  (app.getHttpAdapter().getInstance() as Express).set('trust proxy', 1);
  app.use(cookieParser());
  app.useGlobalFilters(new AllExceptionsFilter());
  // Money fields are BigInt (see docs/BLUEPRINT.md §41); Express's default
  // JSON serializer throws on them, so every finance response needs this.
  (app.getHttpAdapter().getInstance() as Express).set(
    'json replacer',
    (_key: string, value: unknown) =>
      typeof value === 'bigint' ? value.toString() : value,
  );
  app.enableCors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  });
  await app.listen(env.PORT ?? env.API_PORT, '0.0.0.0');
}
void bootstrap();
