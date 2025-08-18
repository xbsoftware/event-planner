import { NextRequest, NextResponse } from 'next/server'
import { verifyCode, findUserByEmail, updateUserLastLogin } from '@/lib/userService'

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json()

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and code are required' },
        { status: 400 }
      )
    }

    // Verify the code
    const isValidCode = await verifyCode(email, code)

    if (!isValidCode) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      )
    }

    // Get user data
    const user = await findUserByEmail(email)
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Update last login
    await updateUserLastLogin(user.id)

    // Create session data (in a real app, you'd use proper session management)
    const sessionData = {
      userId: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    }

    return NextResponse.json({
      message: 'Login successful',
      user: sessionData,
    })
  } catch (error) {
    console.error('Error verifying code:', error)
    return NextResponse.json(
      { error: 'Failed to verify code' },
      { status: 500 }
    )
  }
}
