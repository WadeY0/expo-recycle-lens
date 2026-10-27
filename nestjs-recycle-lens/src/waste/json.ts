import { Prisma } from '@prisma/client';
export function toJson(value: unknown): Prisma.InputJsonValue {
  const copy: unknown = JSON.parse(JSON.stringify(value));
  return copy as Prisma.InputJsonValue;
}
