import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// System default categories are cloned onto every new user at registration
// (see the user module, Phase 1 step 7) so each user's category list is their
// own editable copy from day one, not a shared global row. This seed only
// establishes the canonical name/icon list other code reads from.
export const SYSTEM_DEFAULT_EXPENSE_CATEGORIES = [
  { name: "Food", icon: "utensils" },
  { name: "Transport", icon: "car" },
  { name: "Housing", icon: "home" },
  { name: "Utilities", icon: "bolt" },
  { name: "Shopping", icon: "bag" },
  { name: "Entertainment", icon: "film" },
  { name: "Health", icon: "heart-pulse" },
  { name: "Education", icon: "graduation-cap" },
  { name: "Insurance", icon: "shield" },
  { name: "Other", icon: "ellipsis" },
];

export const SYSTEM_DEFAULT_INCOME_CATEGORIES = [
  { name: "Salary", icon: "wallet" },
  { name: "Freelance", icon: "laptop" },
  { name: "Business", icon: "briefcase" },
  { name: "Commission", icon: "percent" },
  { name: "Interest", icon: "landmark" },
  { name: "Other", icon: "ellipsis" },
];

async function main() {
  console.log(
    `Seed defines ${SYSTEM_DEFAULT_EXPENSE_CATEGORIES.length} expense categories and ${SYSTEM_DEFAULT_INCOME_CATEGORIES.length} income categories.`,
  );
  console.log("Nothing is written globally; these are cloned per-user at registration.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
