import type { PrismaService } from '../src/prisma/prisma.service.js';

/** Deletes every row belonging to users whose email contains `emailPattern`,
 * in FK-safe dependency order. Used in afterAll so e2e runs don't accumulate
 * data in the dedicated test database across runs. */
export async function cleanupTestUsers(
  prisma: PrismaService,
  emailPattern: string,
): Promise<void> {
  const users = await prisma.user.findMany({
    where: { email: { contains: emailPattern } },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);
  if (userIds.length === 0) return;

  await prisma.auditLog.deleteMany({ where: { actorId: { in: userIds } } });
  await prisma.category.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.income.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.expense.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.reminder.deleteMany({
    where: { scheduledPayment: { userId: { in: userIds } } },
  });
  await prisma.scheduledPayment.deleteMany({
    where: { userId: { in: userIds } },
  });
  await prisma.loanPayment.deleteMany({
    where: { loan: { userId: { in: userIds } } },
  });
  await prisma.loanSchedule.deleteMany({
    where: { loan: { userId: { in: userIds } } },
  });
  await prisma.loan.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.twoFactorSecret.deleteMany({
    where: { userId: { in: userIds } },
  });
  await prisma.verificationToken.deleteMany({
    where: { userId: { in: userIds } },
  });
  await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.userProfile.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}
