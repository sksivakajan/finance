import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  CreateScheduledPaymentInput,
  UpdateScheduledPaymentInput,
} from '@finance/shared';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { PaginationQuery } from '../../../common/pagination.js';
import { nextOccurrence } from './recurrence.js';

@Injectable()
export class ScheduledPaymentService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, { cursor, limit }: PaginationQuery) {
    const items = await this.prisma.scheduledPayment.findMany({
      where: { userId, deletedAt: null },
      include: { reminders: true },
      orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = items.length > limit;
    const page = hasMore ? items.slice(0, limit) : items;
    return {
      items: page,
      nextCursor: hasMore ? page[page.length - 1]?.id : null,
    };
  }

  create(userId: string, input: CreateScheduledPaymentInput) {
    const { reminderOffsetDays, ...rest } = input;
    return this.prisma.scheduledPayment.create({
      data: {
        ...rest,
        userId,
        reminders: {
          create: reminderOffsetDays.map((offsetDays) => ({ offsetDays })),
        },
      },
      include: { reminders: true },
    });
  }

  async update(userId: string, id: string, input: UpdateScheduledPaymentInput) {
    await this.assertOwnership(userId, id);
    return this.prisma.scheduledPayment.update({
      where: { id },
      data: input,
      include: { reminders: true },
    });
  }

  async remove(userId: string, id: string) {
    await this.assertOwnership(userId, id);
    await this.prisma.scheduledPayment.update({
      where: { id },
      data: { status: 'CANCELLED', deletedAt: new Date() },
    });
    return { message: 'Scheduled payment cancelled.' };
  }

  // Marks paid and, for a recurring series, immediately generates the next
  // occurrence (spec §12: "After a recurring payment is marked paid, generate
  // the next occurrence"). The two writes happen in one transaction so a
  // payment is never marked paid without its successor existing, or vice versa.
  async markPaid(userId: string, id: string) {
    const payment = await this.assertOwnership(userId, id);
    if (payment.status === 'PAID') {
      throw new BadRequestException({
        code: 'ALREADY_PAID',
        message: 'This payment is already marked paid.',
      });
    }

    const reminders = await this.prisma.reminder.findMany({
      where: { scheduledPaymentId: id },
    });
    const offsetDays = reminders.map((r) => r.offsetDays);

    const [updated] = await this.prisma.$transaction([
      this.prisma.scheduledPayment.update({
        where: { id },
        data: { status: 'PAID' },
      }),
      ...(payment.recurrence === 'NONE'
        ? []
        : [
            this.prisma.scheduledPayment.create({
              data: {
                userId,
                name: payment.name,
                amountMinor: payment.amountMinor,
                currency: payment.currency,
                categoryId: payment.categoryId,
                dueDate: nextOccurrence(payment.dueDate, payment.recurrence),
                recurrence: payment.recurrence,
                notes: payment.notes,
                parentSeriesId: payment.parentSeriesId ?? payment.id,
                reminders: {
                  create: offsetDays.map((d) => ({ offsetDays: d })),
                },
              },
            }),
          ]),
    ]);
    return updated;
  }

  private async assertOwnership(userId: string, id: string) {
    const payment = await this.prisma.scheduledPayment.findFirst({
      where: { id, deletedAt: null },
    });
    if (!payment || payment.userId !== userId) {
      throw new BadRequestException({
        code: 'SCHEDULED_PAYMENT_NOT_FOUND',
        message: 'Scheduled payment not found.',
      });
    }
    return payment;
  }
}
