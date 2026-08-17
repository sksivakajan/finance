import { BadRequestException, type PipeTransform } from '@nestjs/common';
import type { ZodType, z } from 'zod';

export class ZodValidationPipe<T extends ZodType> implements PipeTransform<
  unknown,
  z.infer<T>
> {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.infer<T> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Please check the highlighted fields and try again.',
        issues: result.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
    }
    // zod v3's generic `ZodType` defaults Output to `any`, so `result.data`
    // resolves against that default when accessed through `this.schema: T`
    // inside the class body. The cast just restates the return type already
    // declared above; safeParse has already done the real validation.
    return result.data as z.infer<T>;
  }
}
