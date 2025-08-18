import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { isEventPast } from '@/utils/eventStatus'
import { prisma } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    // Authenticate the request
    const auth = authenticateRequest(request)
    if (!auth.isAuthenticated || !auth.user) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: eventId, userId } = await params

    if (!eventId || !userId) {
      return NextResponse.json(
        { error: 'Event ID and User ID are required' },
        { status: 400 }
      )
    }

    // Users can only access their own registration, managers can access any
    if (auth.user.userId !== userId && auth.user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get full registration details including custom field responses
    const registration = await prisma.eventRegistration.findFirst({
      where: {
        eventId,
        userId,
        status: { not: 'CANCELLED' }, // Only count active registrations
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          }
        },
        responses: true,
      }
    })

    if (!registration) {
      return NextResponse.json({ 
        isRegistered: false,
        registration: null 
      })
    }

    return NextResponse.json({ 
      isRegistered: true,
      registration: {
        id: registration.id,
        eventId: registration.eventId,
        userId: registration.userId,
        firstName: registration.firstName,
        lastName: registration.lastName,
        email: registration.email,
        phone: registration.phone,
        status: registration.status,
        registeredAt: registration.registeredAt,
        customFieldResponses: (registration.responses || []).map(response => ({
          customFieldId: response.fieldId,
          value: response.value
        })),
        user: registration.user,
      }
    })
  } catch (error) {
    console.error('Error checking registration status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    // Authenticate the request
    const auth = authenticateRequest(request)
    if (!auth.isAuthenticated || !auth.user) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: eventId, userId } = await params

    if (!eventId || !userId) {
      return NextResponse.json(
        { error: 'Event ID and User ID are required' },
        { status: 400 }
      )
    }

    // Users can only update their own registration, managers can update any
    if (auth.user.userId !== userId && auth.user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { firstName, lastName, email, phone, customFieldResponses } = body

    // Check if the event exists and is not in the past
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        }
      }
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Check if event is in the past (prevent updates to past events)
    // Use the same logic as the frontend to ensure consistency
    if (isEventPast(event as any)) {
      return NextResponse.json(
        { error: 'Cannot update registration for past events' },
        { status: 400 }
      )
    }

    // Find existing registration
    const existingRegistration = await prisma.eventRegistration.findFirst({
      where: {
        eventId,
        userId,
        status: { not: 'CANCELLED' },
      },
    })

    if (!existingRegistration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      )
    }

    // Update the registration
    const updatedRegistration = await prisma.eventRegistration.update({
      where: { id: existingRegistration.id },
      data: {
        firstName: firstName || existingRegistration.firstName,
        lastName: lastName || existingRegistration.lastName,
        email: email || existingRegistration.email,
        phone: phone !== undefined ? phone : existingRegistration.phone,
      },
    })

    // Update custom field responses if provided
    if (customFieldResponses) {
      // Delete existing custom field responses
      await prisma.eventFieldResponse.deleteMany({
        where: { registrationId: updatedRegistration.id }
      })

      // Create new custom field responses
      if (Object.keys(customFieldResponses).length > 0) {
        const customFieldData = Object.entries(customFieldResponses).map(([fieldId, value]) => ({
          registrationId: updatedRegistration.id,
          fieldId: fieldId,
          value: typeof value === 'string' ? value : JSON.stringify(value),
        }))

        await prisma.eventFieldResponse.createMany({
          data: customFieldData,
        })
      }
    }

    // Fetch the updated registration with all relations
    const finalRegistration = await prisma.eventRegistration.findUnique({
      where: { id: updatedRegistration.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          }
        },
        responses: true,
      }
    })

    return NextResponse.json({
      message: 'Registration updated successfully',
      registration: finalRegistration ? {
        id: finalRegistration.id,
        eventId: finalRegistration.eventId,
        userId: finalRegistration.userId,
        firstName: finalRegistration.firstName,
        lastName: finalRegistration.lastName,
        email: finalRegistration.email,
        phone: finalRegistration.phone,
        status: finalRegistration.status,
        registeredAt: finalRegistration.registeredAt,
        customFieldResponses: (finalRegistration.responses || []).map(response => ({
          customFieldId: response.fieldId,
          value: response.value
        })),
        user: finalRegistration.user,
      } : null
    })
  } catch (error) {
    console.error('Error updating registration:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
