import { Prisma } from '@prisma/client';

export const safeUserSelect = {
  id: true,
  email: true,
  fullName: true,
  avatar: true,
  role: true,
  age: true,
  isVerified: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;
export type SafeUser = Prisma.UserGetPayload<{ select: typeof safeUserSelect }>;

export function userResponse(user: SafeUser): SafeUser {
  const {
    id,
    email,
    fullName,
    avatar,
    role,
    age,
    isVerified,
    createdAt,
    updatedAt,
  } = user;
  const base = process.env.BASE_URL;
  const url =
    avatar && !/^https?:\/\//i.test(avatar) && base
      ? `${base.replace(/\/$/, '')}/${avatar.replace(/^\//, '')}`
      : avatar;
  return {
    id,
    email,
    fullName,
    avatar: url,
    role,
    age,
    isVerified,
    createdAt,
    updatedAt,
  };
}
