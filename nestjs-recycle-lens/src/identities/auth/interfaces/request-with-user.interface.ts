import { Request } from 'express';
import { User } from '@prisma/client';

export type UserWithoutPassword = Omit<User, 'password'>;

export interface IRequestWithUser extends Request {
  user: { id: string; email: string; role: string; tenantId: string };
}
