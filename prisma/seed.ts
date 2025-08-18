import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Default password for demo users
  const defaultPassword = await bcrypt.hash('password123', 12)

  // Create sample users
  const users = [
    {
      email: 'manager@email.com',
      firstName: 'Manager',
      lastName: 'User',
      role: UserRole.MANAGER,
      password: defaultPassword,
    },
    {
      email: 'regular@email.com',
      firstName: 'Regular',
      lastName: 'User',
      role: UserRole.REGULAR,
      password: defaultPassword,
    },
  ]

  for (const userData of users) {
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    })

    if (!existingUser) {
      const user = await prisma.user.create({
        data: userData,
      })
      console.log(`Created user: ${user.email} (${user.role})`)
    } else {
      // Update existing user with password if they don't have one
      if (!existingUser.password) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { password: defaultPassword },
        })
        console.log(`Updated password for: ${existingUser.email}`)
      } else {
        console.log(`User already exists: ${userData.email}`)
      }
    }
  }

  console.log('Database seeding completed!')
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
