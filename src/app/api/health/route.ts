import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Test database connection by counting users
    const userCount = await prisma.user.count()
    const managerCount = await prisma.user.count({
      where: { role: 'MANAGER' }
    })
    const regularCount = await prisma.user.count({
      where: { role: 'REGULAR' }
    })

    return NextResponse.json({
      status: 'Database connected successfully! 🎉',
      stats: {
        totalUsers: userCount,
        managers: managerCount,
        regularUsers: regularCount,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Database connection error:', error)
    return NextResponse.json(
      { 
        status: 'Database connection failed! ❌',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
