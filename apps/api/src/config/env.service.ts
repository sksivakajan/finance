import { Injectable } from '@nestjs/common';
import { envSchema, type Env } from './env.schema.js';

@Injectable()
export class EnvService {
  readonly values: Env;

  constructor() {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      // Fail fast and loud: a misconfigured/missing env var is a deploy-time bug,
      // not something to silently default around.
      throw new Error(
        `Invalid environment configuration:\n${result.error.issues
          .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
          .join('\n')}`,
      );
    }
    this.values = result.data;
  }
}
