import { NextRequest, NextResponse } from 'next/server'
import { isEventPast } from '@/utils/eventStatus'
import { prisma } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params
    const body = await request.json()
    const { userId, firstName, lastName, email, phone, customFieldResponses } = body

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: 'First name, last name, and email are required' },
        { status: 400 }
      )
    }

    // Check if event exists and is active
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
        },
        registrations: {
          where: { status: { not: 'CANCELLED' } },
        },
      },
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    if (!event.isActive) {
      return NextResponse.json(
        { error: 'Event is not active' },
        { status: 400 }
      )
    }

    // Check if event is in the past
    if (isEventPast(event as any)) {
      return NextResponse.json(
        { error: 'Cannot register for past events' },
        { status: 400 }
      )
    }

    // Check capacity
    if (event.maxCapacity && event.registrations.length >= event.maxCapacity) {
      return NextResponse.json(
        { error: 'Event is full' },
        { status: 400 }
      )
    }

    // Check for existing registration (active or cancelled)
    let registration
    if (userId) {
      const existingRegistration = await prisma.eventRegistration.findFirst({
        where: {
          eventId,
          userId,
        },
        orderBy: {
          registeredAt: 'desc', // Get the most recent registration
        },
      })

      if (existingRegistration) {
        if (existingRegistration.status !== 'CANCELLED') {
          return NextResponse.json(
            { error: 'Already registered for this event' },
            { status: 400 }
          )
        }

        // Reactivate cancelled registration with updated info
        registration = await prisma.eventRegistration.update({
          where: { id: existingRegistration.id },
          data: {
            firstName,
            lastName,
            email,
            phone,
            status: 'CONFIRMED',
            registeredAt: new Date(), // Update registration timestamp
          },
        })

        // Delete old custom field responses for this registration
        await prisma.eventFieldResponse.deleteMany({
          where: { registrationId: registration.id },
        })
      } else {
        // Create new registration
        registration = await prisma.eventRegistration.create({
          data: {
            eventId,
            userId,
            firstName,
            lastName,
            email,
            phone,
            status: 'CONFIRMED',
          },
        })
      }
    } else {
      // Anonymous registration - always create new
      registration = await prisma.eventRegistration.create({
        data: {
          eventId,
          userId,
          firstName,
          lastName,
          email,
          phone,
          status: 'CONFIRMED',
        },
      })
    }

    // Save custom field responses if provided
    if (customFieldResponses && Object.keys(customFieldResponses).length > 0) {
      const fieldResponsesData = Object.entries(customFieldResponses).map(([fieldId, value]) => ({
        registrationId: registration.id,
        fieldId,
        value: typeof value === 'object' ? JSON.stringify(value) : String(value),
      }))

      await prisma.eventFieldResponse.createMany({
        data: fieldResponsesData,
      })
    }

    return NextResponse.json({ 
      message: 'Successfully registered for event',
      registration: {
        id: registration.id,
        status: registration.status,
        registeredAt: registration.registeredAt,
      }
    })
  } catch (error) {
    console.error('Error registering for event:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
