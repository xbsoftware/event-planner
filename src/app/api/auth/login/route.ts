import { NextRequest, NextResponse } from 'next/server'
import { findUserByEmail, updateUserLastLogin } from '@/lib/userService'
import { generateToken } from '@/lib/jwt'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }


    // Find user by email
    const user = await findUserByEmail(email)
    if (!user) {
      console.log('No user found for email:', email)
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    console.log('Login - User found in database:', user)

    // Verify password using bcrypt
    let validPassword = false
    if (user.password) {
      try {
        console.log('Password to check:', password)
        console.log('Hash from DB:', user.password)
        bcrypt.hash('password123', 12).then(console.log);
        validPassword = await bcrypt.compare(password, user.password)
        console.log('bcrypt.compare result:', validPassword)
      } catch (err) {
        console.error('bcrypt.compare error:', err)
      }
    } else {
      console.log('User has no password set in DB')
    }

    if (!validPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    })

    console.log('JWT token generated for user:', { id: user.id, email: user.email })

    // Update last login timestamp
    await updateUserLastLogin(user.id)

    // Return user data and token
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      token,
      message: 'Login successful'
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
