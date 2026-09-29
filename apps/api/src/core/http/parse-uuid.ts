import { ParseUUIDPipe } from '@nestjs/common';

// Every :id path param is a UUID (plan 05). Non-UUIDs get a 400 instead of reaching Prisma.
export const UUID = new ParseUUIDPipe({ version: undefined });
