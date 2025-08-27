import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateRequest, hasRole } from "@/lib/auth";

// Simple in-memory cache for recent events (helps with multiple quick requests)
let eventCache: { data: any[]; timestamp: number } | null = null;
const CACHE_TTL = 0; // disable to prevent stale cards after delete

export async function GET(request: NextRequest) {
  try {
    console.log("Fetching events...");

    // Check cache first (helps with rapid successive calls)
    if (eventCache && Date.now() - eventCache.timestamp < CACHE_TTL) {
      console.log("Returning cached events:", eventCache.data.length);
      return NextResponse.json({ events: eventCache.data });
    }

    // Try to get current user if authenticated (optional for events API)
    const auth = authenticateRequest(request);
    const currentUserId = auth.isAuthenticated
      ? (auth.user as any)?.userId
      : null;
    console.log("Current user ID:", currentUserId);

    const events = await (prisma.event as any).findMany({
      select: {
        id: true,
        label: true,
        description: true,
        shortDescription: true,
        avatarUrl: true,
        startDate: true,
        endDate: true,
        startTime: true,
        endTime: true,
        location: true,
        maxCapacity: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        customFields: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            label: true,
            controlType: true,
            isRequired: true,
            options: true,
            order: true,
          },
        },
        registrations: currentUserId
          ? {
              // only fetch what's needed to compute per-user status
              select: { id: true, status: true, userId: true },
              where: { status: { not: "CANCELLED" } },
            }
          : undefined,
        _count: {
          select: {
            registrations: { where: { status: { not: "CANCELLED" } } },
          },
        },
      },
      orderBy: { startDate: "asc" },
    });

    console.log(`Found ${events.length} events in database`);
    if (events.length > 0) {
      console.log(
        "Event IDs:",
        events.map((e: any) => ({
          id: e.id,
          label: e.label,
          isActive: e.isActive,
        }))
      );
    }

    // Transform the data to match our interface
    const formattedEvents = events.map((event: any) => {
      // Check if current user is registered for this event
      const userRegistration = currentUserId
        ? event.registrations.find(
            (reg: any) =>
              reg.userId === currentUserId && reg.status !== "CANCELLED"
          )
        : null;

      return {
        id: event.id,
        title: event.label, // Use label as title for backward compatibility
        label: event.label,
        description: event.description,
        shortDescription: event.shortDescription,
        avatarUrl: event.avatarUrl,
        startDate: event.startDate,
        endDate: event.endDate,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
        maxCapacity: event.maxCapacity,
        isActive: event.isActive,
        status: event.isActive ? "ACTIVE" : "DRAFT", // Add status based on isActive
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
        createdBy: event.createdBy,
        customFields: event.customFields.map((field: any) => ({
          id: field.id,
          label: field.label,
          controlType: field.controlType,
          isRequired: field.isRequired,
          options: field.options ? JSON.parse(field.options) : null,
          order: field.order,
        })),
        // Do not include full registrations array in list payload
        registrationCount: event._count.registrations,
        _count: {
          registrations: event._count.registrations,
        },
        // Add user registration status
        isUserRegistered: !!userRegistration,
        userRegistrationStatus: userRegistration?.status || null,
      };
    });

    console.log(`Returning ${formattedEvents.length} formatted events`);
    console.log(
      "Formatted event IDs:",
      formattedEvents.map((e: any) => ({
        id: e.id,
        label: e.label,
        isActive: e.isActive,
      }))
    );

    // Cache the results for a short time to help with rapid successive calls
    eventCache = {
      data: formattedEvents,
      timestamp: Date.now(),
    };

    return NextResponse.json({ events: formattedEvents });
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const auth = authenticateRequest(request);
    if (!auth.isAuthenticated || !auth.user) {
      return NextResponse.json(
        { error: auth.error || "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user has manager role
    if (!hasRole(auth.user, "MANAGER")) {
      return NextResponse.json(
        { error: "Only managers can create events" },
        { status: 403 }
      );
    }

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
      customFields,
    } = body;

    // Validate required fields
    if (!label || !startDate) {
      return NextResponse.json(
        { error: "Label and start date are required" },
        { status: 400 }
      );
    }

    // Remove the role check since we now use JWT authentication
    // The user is already validated as a MANAGER above

    // Validate dates
    const startDateTime = new Date(startDate);
    if (isNaN(startDateTime.getTime())) {
      return NextResponse.json(
        { error: "Invalid start date" },
        { status: 400 }
      );
    }

    let endDateTime: Date | null = null;
    if (endDate) {
      endDateTime = new Date(endDate);
      if (isNaN(endDateTime.getTime())) {
        return NextResponse.json(
          { error: "Invalid end date" },
          { status: 400 }
        );
      }
      if (endDateTime < startDateTime) {
        return NextResponse.json(
          { error: "End date cannot be before start date" },
          { status: 400 }
        );
      }
    }

    // Use the authenticated user's email to find the current user in this database instance
    const userEmail = auth.user.email;
    console.log("Finding user by email:", userEmail);

    // Find the user in the current database instance by email
    const currentUser = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true, email: true },
    });

    if (!currentUser) {
      console.error("User not found by email:", userEmail);
      return NextResponse.json(
        { error: "User not found. Please log in again." },
        { status: 401 }
      );
    }

    console.log("User found by email:", {
      id: currentUser.id,
      email: currentUser.email,
    });

    // Use the current database instance's user ID
    const creatorUserId = currentUser.id;

    console.log("Creating new event:", {
      label,
      startDate: startDateTime,
      isActive: "default(true)",
    });
    console.log("Event data to create:", {
      label,
      description,
      shortDescription,
      startDate: startDateTime,
      endDate: endDateTime,
      startTime,
      endTime,
      location,
      maxCapacity,
      createdById: creatorUserId,
      customFieldsCount: customFields?.length || 0,
    });

    // Create event with custom fields
    let event;
    try {
      event = await (prisma.event as any).create({
        data: {
          label,
          description,
          shortDescription,
          avatarUrl,
          startDate: startDateTime,
          endDate: endDateTime,
          startTime,
          endTime,
          location,
          maxCapacity,
          createdById: creatorUserId,
          customFields:
            customFields && customFields.length > 0
              ? {
                  create: customFields.map((field: any, index: number) => ({
                    label: field.label,
                    controlType: field.controlType,
                    isRequired: field.isRequired || false,
                    options: field.options
                      ? JSON.stringify(field.options)
                      : null,
                    order: field.order || index,
                  })),
                }
              : undefined,
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
            orderBy: {
              order: "asc",
            },
          },
          _count: {
            select: {
              registrations: true,
            },
          },
        } as any,
      });
      console.log("Prisma event creation successful");
    } catch (prismaError) {
      console.error("Prisma event creation failed:", prismaError);
      throw new Error(
        `Database error: ${
          prismaError instanceof Error
            ? prismaError.message
            : String(prismaError)
        }`
      );
    }

    // Transform response
    const eventData = event as any;
    const safeEvent = {
      id: eventData.id,
      label: eventData.label,
      description: eventData.description,
      shortDescription: eventData.shortDescription,
      avatarUrl: eventData.avatarUrl,
      startDate: eventData.startDate.toISOString(),
      endDate: eventData.endDate?.toISOString(),
      startTime: eventData.startTime,
      endTime: eventData.endTime,
      location: eventData.location,
      maxCapacity: eventData.maxCapacity,
      isActive: eventData.isActive,
      createdAt: eventData.createdAt.toISOString(),
      updatedAt: eventData.updatedAt.toISOString(),
      createdBy: eventData.createdBy,
      customFields: eventData.customFields.map((field: any) => ({
        id: field.id,
        label: field.label,
        controlType: field.controlType as
          | "text"
          | "textarea"
          | "toggle"
          | "multiselect",
        isRequired: field.isRequired,
        options: field.options
          ? JSON.parse(field.options as string)
          : undefined,
        order: field.order,
      })),
      registrationCount: eventData._count?.registrations || 0,
    };

    console.log("Event created successfully:", {
      id: event.id,
      label: event.label,
      isActive: event.isActive,
      createdAt: event.createdAt,
    });

    // Invalidate cache since we have new data
    eventCache = null;

    return NextResponse.json({
      message: "Event created successfully",
      event: safeEvent,
    });
  } catch (error) {
    console.error("Error creating event:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error:
          "Failed to create event: " +
          (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 }
    );
  }
}
