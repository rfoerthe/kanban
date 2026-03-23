"use server";

import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  verifyPassword,
  createSession,
  clearSession,
  getSession,
  requireAuth,
  requireRole,
} from "@/lib/auth";
import type { SafeUser } from "@/lib/types";

export async function login(
  username: string,
  password: string
): Promise<{ success: boolean; error?: string; user?: SafeUser }> {
  const user = await prisma.user.findUnique({
    where: { username },
  });

  if (!user) {
    return { success: false, error: "Invalid username or password" };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { success: false, error: "Invalid username or password" };
  }

  await createSession(user.id);

  return {
    success: true,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      role: user.role,
      createdAt: user.createdAt,
    },
  };
}

export async function logout(): Promise<void> {
  await clearSession();
}

export async function getCurrentUser(): Promise<SafeUser | null> {
  return getSession();
}

export async function createUser(data: {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  role: string;
}): Promise<{ success: boolean; error?: string }> {
  await requireRole(["ADMIN"]);

  const existing = await prisma.user.findUnique({
    where: { username: data.username },
  });

  if (existing) {
    return { success: false, error: "Username already exists" };
  }

  const passwordHash = await hashPassword(data.password);

  await prisma.user.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      username: data.username,
      passwordHash,
      role: data.role,
    },
  });

  return { success: true };
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const sessionUser = await requireAuth();

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
  });

  if (!user) {
    return { success: false, error: "User not found" };
  }

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) {
    return { success: false, error: "Current password is incorrect" };
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  return { success: true };
}

export async function getUsers(): Promise<SafeUser[]> {
  await requireRole(["ADMIN"]);

  return prisma.user.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      username: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function updateUser(
  userId: string,
  data: {
    firstName?: string;
    lastName?: string;
    username?: string;
    role?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  await requireRole(["ADMIN"]);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { success: false, error: "User not found" };
  }

  if (data.username && data.username !== user.username) {
    const existing = await prisma.user.findUnique({
      where: { username: data.username },
    });
    if (existing) {
      return { success: false, error: "Username already exists" };
    }
  }

  const updateData: Record<string, string> = {};
  if (data.firstName !== undefined) updateData.firstName = data.firstName;
  if (data.lastName !== undefined) updateData.lastName = data.lastName;
  if (data.username !== undefined) updateData.username = data.username;
  if (data.role !== undefined) updateData.role = data.role;

  await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  return { success: true };
}

export async function deleteUser(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const currentUser = await requireRole(["ADMIN"]);

  if (currentUser.id === userId) {
    return { success: false, error: "You cannot delete your own account" };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { success: false, error: "User not found" };
  }

  await prisma.user.delete({ where: { id: userId } });

  return { success: true };
}

export async function resetPassword(
  userId: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  await requireRole(["ADMIN"]);

  if (newPassword.length < 6) {
    return { success: false, error: "Password must be at least 6 characters" };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { success: false, error: "User not found" };
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  return { success: true };
}
