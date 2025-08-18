import { NextRequest, NextResponse } from 'next/server'
import { updateUser, getUserById } from '@/lib/userService'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const userId = resolvedParams.id
    const body = await request.json()
    const { firstName, lastName, email, role, isActive, currentUserRole } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Check if current user is manager
    if (currentUserRole !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Only managers can edit user information' },
        { status: 403 }
      )
    }

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: 'First name, last name, and email are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate role if provided
    if (role && !['MANAGER', 'REGULAR'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be MANAGER or REGULAR' },
        { status: 400 }
      )
    }

    // Check if user exists
    const existingUser = await getUserById(userId)
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const updateData: any = {
      firstName,
      lastName,
      email,
    }

    // Only include role and isActive if they are provided
    if (role !== undefined) {
      updateData.role = role
    }
    if (isActive !== undefined) {
      updateData.isActive = isActive
    }

    const updatedUser = await updateUser(userId, updateData)

    // Remove sensitive information before sending
    const safeUser = {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      role: updatedUser.role,
      isActive: updatedUser.isActive,
      createdAt: updatedUser.createdAt,
      lastLoginAt: updatedUser.lastLoginAt,
    }

    return NextResponse.json({ user: safeUser })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const userId = resolvedParams.id
    const body = await request.json()
    const { currentUserRole } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Check if current user is manager
    if (currentUserRole !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Only managers can delete users' },
        { status: 403 }
      )
    }

    // Check if user exists
    const existingUser = await getUserById(userId)
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Prevent deleting yourself
    // Note: In a real app, you'd get the current user ID from session/JWT
    // For now, we'll just prevent deleting if it's the only manager
    const { getAllUsers } = await import('@/lib/userService')
    const allUsers = await getAllUsers()
    const managers = allUsers.filter(u => u.role === 'MANAGER')
    
    if (existingUser.role === 'MANAGER' && managers.length === 1) {
      return NextResponse.json(
        { error: 'Cannot delete the last manager account' },
        { status: 400 }
      )
    }

    // Delete the user
    const { prisma } = await import('@/lib/db')
    await prisma.user.delete({
      where: { id: userId }
    })

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}
