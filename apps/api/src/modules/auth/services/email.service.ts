import { Injectable, Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import { EnvService } from '../../../config/env.service.js';

interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
}

// EMAIL_DRIVER=console (this machine's default, see .env.example): logs the
// message instead of sending it, so email-gated flows are testable with no mail
// server. EMAIL_DRIVER=smtp sends for real via nodemailer.
@Injectable()
export class EmailService {
  private readonly logger = new Logger('Email');
  private transporter: Transporter | null = null;

  constructor(private readonly env: EnvService) {
    if (this.env.values.EMAIL_DRIVER === 'smtp') {
      this.transporter = createTransport({
        host: this.env.values.SMTP_HOST,
        port: this.env.values.SMTP_PORT,
        auth: this.env.values.SMTP_USER
          ? { user: this.env.values.SMTP_USER, pass: this.env.values.SMTP_PASS }
          : undefined,
      });
    }
  }

  async send({ to, subject, text }: SendEmailInput): Promise<void> {
    if (this.env.values.EMAIL_DRIVER === 'console') {
      this.logger.log(
        `\n--- EMAIL (console driver) ---\nTo: ${to}\nSubject: ${subject}\n\n${text}\n-------------------------------`,
      );
      return;
    }

    await this.transporter!.sendMail({
      from: this.env.values.MAIL_FROM,
      to,
      subject,
      text,
    });
  }

  sendVerificationEmail(to: string, token: string) {
    const link = `${this.env.values.WEB_ORIGIN}/verify-email?token=${token}`;
    return this.send({
      to,
      subject: 'Verify your email',
      text: `Welcome! Click the link below to verify your email and activate your account:\n\n${link}\n\nThis link expires in 24 hours.`,
    });
  }

  sendPasswordResetEmail(to: string, token: string) {
    const link = `${this.env.values.WEB_ORIGIN}/reset-password?token=${token}`;
    return this.send({
      to,
      subject: 'Reset your password',
      text: `We received a request to reset your password. Click the link below to choose a new one:\n\n${link}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email.`,
    });
  }
}
