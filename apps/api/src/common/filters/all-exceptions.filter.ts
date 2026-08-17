import {
  ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

// Per docs/BLUEPRINT.md §37: never leak internal error detail to the client.
// HttpExceptions (thrown deliberately by our own code) keep their intended
// status/message; anything else is logged in full server-side and reduced to a
// generic message client-side.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const payload =
        typeof body === 'string'
          ? { error: { code: HttpStatus[status] ?? 'ERROR', message: body } }
          : { error: body };
      response.status(status).json(payload);
      return;
    }

    this.logger.error(
      exception instanceof Error ? exception.stack : String(exception),
    );
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong on our end. Please try again.',
      },
    });
  }
}
