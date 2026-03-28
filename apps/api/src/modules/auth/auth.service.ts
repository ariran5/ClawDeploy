import { eq } from 'drizzle-orm';
import { hash, verify } from 'argon2';
import { db } from '../../db/index.js';
import { users } from '../../db/schema/users.js';
import { subscriptions } from '../../db/schema/subscriptions.js';
import type { RegisterInput, LoginInput } from '@clawdeploy/shared';

export async function registerUser(input: RegisterInput) {
  const existing = await db.select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (existing.length > 0) {
    throw Object.assign(new Error('Email already registered'), { statusCode: 409 });
  }

  const passwordHash = await hash(input.password);

  const [user] = await db.insert(users).values({
    email: input.email,
    passwordHash,
    name: input.name,
  }).returning({
    id: users.id,
    email: users.email,
    name: users.name,
    avatarUrl: users.avatarUrl,
    isActive: users.isActive,
    emailVerified: users.emailVerified,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
  });

  // Create free subscription
  await db.insert(subscriptions).values({
    userId: user.id,
    plan: 'free',
    maxBots: 1,
    maxVpsServers: 1,
  });

  return user;
}

export async function loginUser(input: LoginInput) {
  const [user] = await db.select()
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (!user) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  const valid = await verify(user.passwordHash, input.password);
  if (!valid) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  if (!user.isActive) {
    throw Object.assign(new Error('Account is deactivated'), { statusCode: 403 });
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    isActive: user.isActive,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function getUserById(userId: string) {
  const [user] = await db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    avatarUrl: users.avatarUrl,
    isActive: users.isActive,
    emailVerified: users.emailVerified,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
  })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  return user;
}

export async function updateUser(userId: string, data: { name?: string; avatarUrl?: string | null }) {
  const [user] = await db.update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      avatarUrl: users.avatarUrl,
      isActive: users.isActive,
      emailVerified: users.emailVerified,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    });

  return user;
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const [user] = await db.select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  const valid = await verify(user.passwordHash, currentPassword);
  if (!valid) {
    throw Object.assign(new Error('Current password is incorrect'), { statusCode: 400 });
  }

  const passwordHash = await hash(newPassword);
  await db.update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId));
}
