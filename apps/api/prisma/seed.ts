import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from "../src/modules/finance/category/default-categories.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log(
    `${DEFAULT_EXPENSE_CATEGORIES.length} expense categories and ${DEFAULT_INCOME_CATEGORIES.length} income categories are defined in src/modules/finance/category/default-categories.ts.`,
  );
  console.log("Nothing is written globally; these are cloned onto each user at registration (see AuthService.register).");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
