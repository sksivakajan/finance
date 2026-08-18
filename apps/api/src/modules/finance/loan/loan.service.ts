import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  CreateLoanInput,
  CreateLoanPaymentInput,
  UpdateLoanInput,
} from '@finance/shared';
import { PrismaService } from '../../../prisma/prisma.service.js';

@Injectable()
export class LoanService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const loans = await this.prisma.loan.findMany({
      where: { userId, deletedAt: null },
      include: { payments: true, schedule: true },
      orderBy: { createdAt: 'desc' },
    });
    return loans.map((loan) => this.withRemaining(loan));
  }

  async get(userId: string, id: string) {
    const loan = await this.assertOwnership(userId, id);
    const full = await this.prisma.loan.findUniqueOrThrow({
      where: { id: loan.id },
      include: { payments: { orderBy: { date: 'desc' } }, schedule: true },
    });
    return this.withRemaining(full);
  }

  async create(userId: string, input: CreateLoanInput) {
    const { schedule, ...rest } = input;
    const loan = await this.prisma.loan.create({
      data: {
        ...rest,
        userId,
        ...(schedule ? { schedule: { create: schedule } } : {}),
      },
      include: { payments: true, schedule: true },
    });
    await this.audit(userId, 'loan.created', loan.id);
    return this.withRemaining(loan);
  }

  async update(userId: string, id: string, input: UpdateLoanInput) {
    await this.assertOwnership(userId, id);
    const loan = await this.prisma.loan.update({
      where: { id },
      data: input,
      include: { payments: true, schedule: true },
    });
    return this.withRemaining(loan);
  }

  async addPayment(
    userId: string,
    loanId: string,
    input: CreateLoanPaymentInput,
  ) {
    const loan = await this.assertOwnership(userId, loanId);
    const payment = await this.prisma.loanPayment.create({
      data: { ...input, loanId },
    });
    await this.audit(userId, 'loan.payment_recorded', payment.id);

    const paidSoFar = await this.totalPaid(loanId);
    if (loan.status === 'ACTIVE' && paidSoFar >= loan.principalMinor) {
      await this.prisma.loan.update({
        where: { id: loanId },
        data: { status: 'PAID_OFF' },
      });
    }
    return payment;
  }

  async listPayments(userId: string, loanId: string) {
    await this.assertOwnership(userId, loanId);
    return this.prisma.loanPayment.findMany({
      where: { loanId },
      orderBy: { date: 'desc' },
    });
  }

  private async totalPaid(loanId: string): Promise<bigint> {
    const payments = await this.prisma.loanPayment.findMany({
      where: { loanId },
      select: { amountMinor: true },
    });
    return payments.reduce((sum, p) => sum + p.amountMinor, 0n);
  }

  private withRemaining<
    T extends { principalMinor: bigint; payments: { amountMinor: bigint }[] },
  >(loan: T) {
    const paid = loan.payments.reduce((sum, p) => sum + p.amountMinor, 0n);
    const remainingMinor = loan.principalMinor - paid;
    return {
      ...loan,
      paidMinor: paid,
      remainingMinor: remainingMinor > 0n ? remainingMinor : 0n,
    };
  }

  private async assertOwnership(userId: string, id: string) {
    const loan = await this.prisma.loan.findFirst({
      where: { id, deletedAt: null },
    });
    if (!loan || loan.userId !== userId) {
      throw new BadRequestException({
        code: 'LOAN_NOT_FOUND',
        message: 'Loan not found.',
      });
    }
    return loan;
  }

  private async audit(actorId: string, action: string, resourceId: string) {
    await this.prisma.auditLog.create({
      data: { actorId, action, resourceType: 'Loan', resourceId },
    });
  }
}
