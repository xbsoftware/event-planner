import { UserRole } from '@prisma/client'
import { prisma } from './db'

export interface CreateUserData {
  email: string
  firstName?: string
  lastName?: string
  role?: UserRole
  password?: string
  isActive?: boolean
}

export async function createUser(data: CreateUserData) {
  return await prisma.user.create({
    data: {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role || UserRole.REGULAR,
      password: data.password,
      isActive: data.isActive ?? true,
    },
  })
}

export async function findUserByEmail(email: string) {
  return await prisma.user.findUnique({
    where: { email },
  })
}

export async function updateUserLastLogin(userId: string) {
  return await prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  })
}

export async function createVerificationCode(email: string, code: string) {
  // First, delete any existing codes for this email
  await prisma.verificationCode.deleteMany({
    where: { email },
  })

  // Create new verification code (expires in 15 minutes)
  return await prisma.verificationCode.create({
    data: {
      email,
      code,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    },
  })
}

export async function verifyCode(email: string, code: string) {
  const verificationCode = await prisma.verificationCode.findFirst({
    where: {
      email,
      code,
      used: false,
      expiresAt: {
        gt: new Date(),
      },
    },
  })

  if (verificationCode) {
    // Mark the code as used
    await prisma.verificationCode.update({
      where: { id: verificationCode.id },
      data: { used: true },
    })
    return true
  }

  return false
}

export async function getAllUsers() {
  return await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
  })
}

export async function getUsersByRole(role: UserRole) {
  return await prisma.user.findMany({
    where: { role },
    orderBy: { createdAt: 'desc' },
  })
}

export interface UpdateUserData {
  firstName?: string
  lastName?: string
  email?: string
  role?: UserRole
  isActive?: boolean
}

export async function updateUser(userId: string, data: UpdateUserData) {
  return await prisma.user.update({
    where: { id: userId },
    data,
  })
}

export async function getUserById(userId: string) {
  return await prisma.user.findUnique({
    where: { id: userId },
  })
}
