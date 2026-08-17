import { config } from "dotenv";
import path from "node:path";
import { defineConfig, env } from "prisma/config";

// Single source of truth for env vars is the monorepo root .env (see
// docs/BLUEPRINT.md and .env.example), not a per-package copy.
config({ path: path.resolve(__dirname, "../../.env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
