import { NextRequest, NextResponse } from 'next/server'
import { isEventPast } from '@/utils/eventStatus'
import { prisma } from '@/lib/db'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Check if event is in the past
    if (isEventPast(event as any)) {
      return NextResponse.json(
        { error: 'Cannot unregister from past events' },
        { status: 400 }
      )
    }

    // Find existing registration
    const registration = await prisma.eventRegistration.findFirst({
      where: {
        eventId,
        userId,
        status: { not: 'CANCELLED' },
      },
    })

    if (!registration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      )
    }

    // Update registration status to cancelled
    await prisma.eventRegistration.update({
      where: { id: registration.id },
      data: { status: 'CANCELLED' },
    })

    return NextResponse.json({ 
      message: 'Successfully unregistered from event'
    })
  } catch (error) {
    console.error('Error unregistering from event:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
