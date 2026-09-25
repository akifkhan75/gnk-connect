import { BadRequestException, PipeTransform, UnprocessableEntityException } from '@nestjs/common';
import type { ZodType } from 'zod';

/**
 * Validates and strips a request body/query with a shared @gnk/validation schema.
 * Usage: `@Body(new ZodPipe(createBookingSchema)) dto: CreateBookingData`.
 * Unknown keys are dropped (Zod objects strip by default), which blocks mass assignment.
 */
export class ZodPipe<T extends ZodType> implements PipeTransform {
  constructor(private readonly schema: T) {}

  transform(value: unknown) {
    if (value === undefined) throw new BadRequestException('Request body is required');
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new UnprocessableEntityException({
        message: 'Some fields are invalid',
        code: 'VALIDATION_FAILED',
        errors: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    return result.data;
  }
}
