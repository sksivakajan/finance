import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import type { Express } from 'express';
import { AppModule } from '../src/app.module.js';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter.js';

/** Mirrors the real bootstrap in src/main.ts, so e2e tests exercise the same
 * middleware/filters/serialization a real request would hit. */
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  app.use(cookieParser());
  app.useGlobalFilters(new AllExceptionsFilter());
  (app.getHttpAdapter().getInstance() as Express).set(
    'json replacer',
    (_key: string, value: unknown) =>
      typeof value === 'bigint' ? value.toString() : value,
  );
  await app.init();
  return app;
}
