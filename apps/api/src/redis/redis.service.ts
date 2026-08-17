import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { EnvService } from '../config/env.service.js';

@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  constructor(env: EnvService) {
    super(env.values.REDIS_URL);
  }

  onModuleDestroy() {
    this.disconnect();
  }
}
