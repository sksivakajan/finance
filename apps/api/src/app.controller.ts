import { Controller, Get } from "@nestjs/common";
import { AppService } from "./app.service.js";
import { PrismaService } from "./prisma/prisma.service.js";

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // Temporary connectivity check for Phase 1, Step 3 verification.
  // Superseded by a proper health module once the auth/user modules land.
  @Get("health/db")
  async checkDb() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: "ok", database: "connected" };
  }
}
