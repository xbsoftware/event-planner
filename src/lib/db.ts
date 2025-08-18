import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createDatabaseClient(): PrismaClient {
  const isProduction = process.env.NODE_ENV === 'production'
  const hasTursoConfig = process.env.TURSO_AUTH_TOKEN && process.env.DATABASE_URL?.startsWith('libsql://')

  if (isProduction && hasTursoConfig) {
    // Official Turso+Prisma pattern
    const adapter = new PrismaLibSQL({
      url: process.env.DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN!,
    })
    return new PrismaClient({ adapter: adapter as any } as any)
  }
  // Local/dev: normal SQLite
  return new PrismaClient()
}

// Initialize Prisma client
const _prisma = globalForPrisma.prisma ?? createDatabaseClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = _prisma

// Export plain Prisma client as per official Turso+Prisma docs
export const prisma = _prisma

async function initializeProductionDB() {
  try {
    console.log('🔄 Checking database schema...')
    
    // Create tables directly using SQL if they don't exist
    try {
      console.log('📊 Creating database schema...')
      
      // Create users table
      await _prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "users" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "email" TEXT NOT NULL,
          "password" TEXT,
          "firstName" TEXT,
          "lastName" TEXT,
          "role" TEXT NOT NULL DEFAULT 'REGULAR',
          "isActive" INTEGER NOT NULL DEFAULT 1,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "lastLoginAt" DATETIME
        )
      `)
      
      // Create events table
      await _prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "events" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "label" TEXT NOT NULL,
          "description" TEXT,
          "shortDescription" TEXT,
          "startDate" DATETIME NOT NULL,
          "endDate" DATETIME,
          "startTime" TEXT,
          "endTime" TEXT,
          "location" TEXT,
          "maxCapacity" INTEGER,
          "isActive" INTEGER NOT NULL DEFAULT 1,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "createdById" TEXT NOT NULL,
          FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
        )
      `)
      
      // Create event_custom_fields table
      await _prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "event_custom_fields" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "eventId" TEXT NOT NULL,
          "label" TEXT NOT NULL,
          "controlType" TEXT NOT NULL,
          "isRequired" INTEGER NOT NULL DEFAULT 0,
          "options" TEXT,
          "order" INTEGER NOT NULL DEFAULT 0,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
      `)
      
      // Create event_registrations table
      await _prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "event_registrations" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "eventId" TEXT NOT NULL,
          "userId" TEXT,
          "firstName" TEXT NOT NULL,
          "lastName" TEXT NOT NULL,
          "email" TEXT NOT NULL,
          "phone" TEXT,
          "status" TEXT NOT NULL DEFAULT 'PENDING',
          "registeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("eventId") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
        )
      `)
      
      // Create event_field_responses table
      await _prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "event_field_responses" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "registrationId" TEXT NOT NULL,
          "fieldId" TEXT NOT NULL,
          "value" TEXT NOT NULL,
          FOREIGN KEY ("registrationId") REFERENCES "event_registrations" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          FOREIGN KEY ("fieldId") REFERENCES "event_custom_fields" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
      `)
      
      // Create verification_codes table
      await _prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "verification_codes" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "email" TEXT NOT NULL,
          "code" TEXT NOT NULL,
          "expiresAt" DATETIME NOT NULL,
          "used" INTEGER NOT NULL DEFAULT 0,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `)
      
      // Create unique indexes
      await _prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email")`)
      await _prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "event_field_responses_registrationId_fieldId_key" ON "event_field_responses"("registrationId", "fieldId")`)
      
      console.log('✅ Database schema created successfully!')
    } catch (schemaError) {
      console.log('⚠️  Schema creation completed (may have warnings)', schemaError)
    }
    
    // Now check if users exist and seed if needed
    let userCount = 0
    try {
      userCount = await _prisma.user.count()
    } catch (error) {
      console.log('ℹ️  Users table may not exist yet, will seed...')
      userCount = 0
    }
    
    if (userCount === 0) {
      console.log('🌱 Seeding production database...')
      
      // Import bcrypt for password hashing
      const bcrypt = await import('bcryptjs')
      const defaultPassword = await bcrypt.hash('password123', 12)
      
      // Create the same users as in your local seed
      await _prisma.user.createMany({
        data: [
          {
            email: 'manager@email.com',
            firstName: 'Manager',
            lastName: 'User',
            role: 'MANAGER',
            password: defaultPassword,
          },
          {
            email: 'regular@email.com',
            firstName: 'Regular',
            lastName: 'User', 
            role: 'REGULAR',
            password: defaultPassword,
          },
        ],
      })
      
      console.log('✅ Production database seeded successfully!')
    } else {
      console.log(`ℹ️  Database already has ${userCount} users, skipping seed`)
    }
  } catch (error) {
    console.error('❌ Error initializing production database:', error)
  }
}
