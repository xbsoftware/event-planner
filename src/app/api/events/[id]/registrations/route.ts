import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params

    // Get and verify JWT token
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    let decodedToken
    try {
      decodedToken = jwt.verify(token, process.env.JWT_SECRET!) as any
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Check if user is a manager
    const user = await prisma.user.findUnique({
      where: { id: decodedToken.userId }
    })

    if (!user || user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Verify the event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Fetch all registrations for the event
    const registrations = await prisma.eventRegistration.findMany({
      where: { eventId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        responses: {
          include: {
            field: {
              select: {
                label: true,
                controlType: true
              }
            }
          }
        }
      },
      orderBy: {
        registeredAt: 'desc'
      }
    })

    // Transform the data to match the expected format
    const transformedRegistrations = registrations.map(registration => ({
      id: registration.id,
      userId: registration.userId,
      firstName: registration.firstName,
      lastName: registration.lastName,
      email: registration.email,
      registeredAt: registration.registeredAt,
      status: registration.status,
      customFieldResponses: registration.responses.map(response => ({
        customFieldId: response.fieldId,
        value: response.value,
        customField: {
          label: response.field.label,
          controlType: response.field.controlType
        }
      }))
    }))

    return NextResponse.json({
      registrations: transformedRegistrations
    })

  } catch (error) {
    console.error('Error fetching event registrations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
