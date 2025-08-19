import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const eventId = resolvedParams.id;

    const event = await (prisma.event as any).findUnique({
      where: { id: eventId },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        customFields: {
          orderBy: { order: "asc" },
        },
        registrations: {
          select: { id: true },
          where: {
            status: { not: "CANCELLED" },
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Format response
    const formattedEvent = {
      id: event.id,
      label: event.label,
      description: event.description,
      shortDescription: event.shortDescription,
      avatarUrl: (event as any).avatarUrl,
      startDate: event.startDate.toISOString().split("T")[0],
      endDate: event.endDate ? event.endDate.toISOString().split("T")[0] : null,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      maxCapacity: event.maxCapacity,
      isActive: event.isActive,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
      createdBy: event.createdBy,
      customFields: event.customFields.map((field: any) => ({
        id: field.id,
        label: field.label,
        controlType: field.controlType,
        isRequired: field.isRequired,
        options: field.options ? JSON.parse(field.options) : null,
        order: field.order,
      })),
      registrationCount: event.registrations.length,
    };

    return NextResponse.json({ event: formattedEvent });
  } catch (error) {
    console.error("Error fetching event:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const eventId = resolvedParams.id;
    const body = await request.json();
    const {
      label,
      description,
      shortDescription,
      avatarUrl,
      startDate,
      endDate,
      startTime,
      endTime,
      location,
      maxCapacity,
      currentUserRole,
      customFields,
    } = body;

    // Validate user role
    if (currentUserRole !== "MANAGER") {
      return NextResponse.json(
        { error: "Access denied. Manager role required." },
        { status: 403 }
      );
    }

    // Validate required fields
    if (!label || !startDate) {
      return NextResponse.json(
        { error: "Label and start date are required" },
        { status: 400 }
      );
    }

    // Validate dates
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : start;

    if (end < start) {
      return NextResponse.json(
        { error: "End date cannot be before start date" },
        { status: 400 }
      );
    }

    // Check if event exists
    const existingEvent = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!existingEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Update the event - using type assertion to work around Prisma cache issues
    const updatedEvent = await (prisma.event as any).update({
      where: { id: eventId },
      data: {
        label,
        description,
        shortDescription,
        avatarUrl,
        startDate: start,
        endDate: end,
        startTime,
        endTime,
        location,
        maxCapacity,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        customFields: {
          orderBy: { order: "asc" },
        },
      },
    });

    // Update custom fields if provided
    if (customFields && Array.isArray(customFields)) {
      // Log the custom fields data for debugging
      console.log(
        "Custom fields received:",
        JSON.stringify(customFields, null, 2)
      );

      // Get existing custom fields with their responses
      const existingFields = await prisma.eventCustomField.findMany({
        where: { eventId },
        include: {
          responses: true,
        },
      });

      // Map existing fields by ID for lookup
      const existingFieldsMap = new Map(existingFields.map((f) => [f.id, f]));

      // Process and validate custom fields
      for (let index = 0; index < customFields.length; index++) {
        const field = customFields[index];
        if (!field || !field.label) continue;

        let controlType = field.controlType;
        if (
          !controlType ||
          !["text", "textarea", "toggle", "multiselect"].includes(controlType)
        ) {
          console.log(
            `Invalid controlType '${controlType}' for field '${field.label}', defaulting to 'text'`
          );
          controlType = "text";
        }

        // Prepare field data
        const fieldData = {
          label: field.label,
          controlType,
          isRequired: Boolean(field.isRequired),
          options:
            field.options && Array.isArray(field.options)
              ? JSON.stringify(field.options)
              : field.id && existingFieldsMap.has(field.id)
              ? existingFieldsMap.get(field.id)?.options
              : null,
          order: index,
        };

        if (field.id && existingFieldsMap.has(field.id)) {
          // Update existing field
          await prisma.eventCustomField.update({
            where: { id: field.id },
            data: fieldData as any,
          });
          existingFieldsMap.delete(field.id); // Mark as processed
        } else {
          // Create new field
          await prisma.eventCustomField.create({
            data: {
              ...(fieldData as any),
              eventId,
            },
          });
        }
      }

      // Delete remaining fields that weren't updated
      for (const [id] of existingFieldsMap) {
        await prisma.eventCustomField.delete({
          where: { id },
        });
      }
    }

    // Fetch the updated event with custom fields
    const eventWithCustomFields = await (prisma.event as any).findUnique({
      where: { id: eventId },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        customFields: {
          orderBy: { order: "asc" },
        },
      },
    });

    // Transform the data to match EventData interface
    const eventData = {
      id: eventWithCustomFields.id,
      label: eventWithCustomFields.label,
      description: eventWithCustomFields.description,
      shortDescription: eventWithCustomFields.shortDescription,
      avatarUrl: (eventWithCustomFields as any).avatarUrl,
      startDate: eventWithCustomFields.startDate.toISOString().split("T")[0],
      endDate: eventWithCustomFields.endDate
        ? eventWithCustomFields.endDate.toISOString().split("T")[0]
        : undefined,
      startTime: eventWithCustomFields.startTime,
      endTime: eventWithCustomFields.endTime,
      location: eventWithCustomFields.location,
      maxCapacity: eventWithCustomFields.maxCapacity,
      isActive: eventWithCustomFields.isActive,
      createdAt: eventWithCustomFields.createdAt.toISOString(),
      updatedAt: eventWithCustomFields.updatedAt.toISOString(),
      createdBy: eventWithCustomFields.createdBy,
      customFields: eventWithCustomFields.customFields.map((field: any) => ({
        id: field.id,
        label: field.label,
        controlType: field.controlType,
        isRequired: field.isRequired,
        options: field.options ? JSON.parse(field.options) : null,
        order: field.order,
      })),
      registrationCount: 0, // TODO: Add registration count when available
    };

    return NextResponse.json({ event: eventData });
  } catch (error) {
    console.error("Error updating event:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const eventId = resolvedParams.id;
    const body = await request.json();
    const { currentUserRole } = body;

    // Validate user role
    if (currentUserRole !== "MANAGER") {
      return NextResponse.json(
        { error: "Access denied. Manager role required." },
        { status: 403 }
      );
    }

    // Check if event exists
    const existingEvent = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!existingEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Check if event has registrations
    // TODO: Enable when Prisma client is properly regenerated
    // const registrationCount = await prisma.eventRegistration.count({
    //   where: { eventId },
    // })

    // if (registrationCount > 0) {
    //   return NextResponse.json(
    //     { error: 'Cannot delete event with existing registrations' },
    //     { status: 400 }
    //   )
    // }

    // Delete event (cascade will handle custom fields)
    await prisma.event.delete({
      where: { id: eventId },
    });

    return NextResponse.json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("Error deleting event:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
