import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule } from './config/config.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { RedisModule } from './redis/redis.module.js';
import { AuthModule } from './modules/auth/auth.module.js';

@Module({
  imports: [ConfigModule, PrismaModule, RedisModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
