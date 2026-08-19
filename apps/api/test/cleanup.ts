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

  const conversations = await prisma.conversationMember.findMany({
    where: { userId: { in: userIds } },
    select: { conversationId: true },
  });
  const conversationIds = [
    ...new Set(conversations.map((c) => c.conversationId)),
  ];
  await prisma.messageReaction.deleteMany({
    where: { message: { conversationId: { in: conversationIds } } },
  });
  await prisma.message.deleteMany({
    where: { conversationId: { in: conversationIds } },
  });
  await prisma.conversationMember.deleteMany({
    where: { conversationId: { in: conversationIds } },
  });
  await prisma.conversation.deleteMany({
    where: { id: { in: conversationIds } },
  });
  await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.friendRequest.deleteMany({
    where: {
      OR: [{ senderId: { in: userIds } }, { receiverId: { in: userIds } }],
    },
  });
  await prisma.friendship.deleteMany({
    where: { OR: [{ userAId: { in: userIds } }, { userBId: { in: userIds } }] },
  });
  await prisma.block.deleteMany({
    where: {
      OR: [{ blockerId: { in: userIds } }, { blockedId: { in: userIds } }],
    },
  });
  await prisma.settlementItem.deleteMany({
    where: {
      settlement: {
        OR: [{ payerId: { in: userIds } }, { receiverId: { in: userIds } }],
      },
    },
  });
  await prisma.settlement.deleteMany({
    where: {
      OR: [{ payerId: { in: userIds } }, { receiverId: { in: userIds } }],
    },
  });
  await prisma.moneyRequest.deleteMany({
    where: {
      OR: [{ senderId: { in: userIds } }, { receiverId: { in: userIds } }],
    },
  });
  const expenseIds = (
    await prisma.expense.findMany({
      where: {
        OR: [
          { ownerId: { in: userIds } },
          { payerId: { in: userIds } },
          { participants: { some: { userId: { in: userIds } } } },
        ],
      },
      select: { id: true },
    })
  ).map((e) => e.id);
  await prisma.expenseSplit.deleteMany({
    where: { expenseId: { in: expenseIds } },
  });
  await prisma.expenseParticipant.deleteMany({
    where: { expenseId: { in: expenseIds } },
  });
  await prisma.expense.deleteMany({ where: { id: { in: expenseIds } } });
  await prisma.groupMember.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.group.deleteMany({ where: { createdById: { in: userIds } } });
  await prisma.auditLog.deleteMany({ where: { actorId: { in: userIds } } });
  await prisma.category.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.income.deleteMany({ where: { userId: { in: userIds } } });
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
