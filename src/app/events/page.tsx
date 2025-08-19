"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { EventService, EventData } from "@/services/eventService";
import { useAuthStore } from "@/lib/stores/authStore";
import { EventsHeader } from "./components/EventsHeader";
import { EventCard } from "./components/EventCard";
import { CreateEventDialog } from "./components/CreateEventDialog";
import { EditEventDialog } from "./components/EditEventDialog";
import { DeleteEventDialog } from "./components/DeleteEventDialog";

function EventsPageContent() {
  const { user } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);

  // Manager-only dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<EventData | null>(null);
  const [eventToDelete, setEventToDelete] = useState<EventData | null>(null);

  useEffect(() => {
    loadEvents();
  }, [user]);

  // Handle edit parameter from URL or sessionStorage
  useEffect(() => {
    // Check for edit parameter from URL
    const editEventId = searchParams.get("edit");
    // Also check sessionStorage for edit intent (for cross-page navigation)
    const sessionEditId =
      typeof window !== "undefined"
        ? sessionStorage.getItem("editEventId")
        : null;

    const targetEventId = editEventId || sessionEditId;

    console.log("=== EDIT PARAMETER CHECK ===");
    console.log("URL edit parameter:", editEventId);
    console.log("Session edit parameter:", sessionEditId);
    console.log("Target event ID:", targetEventId);
    console.log("Events loaded:", events.length);
    console.log("User role:", user?.role);
    console.log("Edit dialog open:", editDialogOpen);

    if (targetEventId && !editDialogOpen) {
      console.log("Edit parameter found!");

      if (!user) {
        console.log("No user found, waiting for auth...");
        return;
      }

      if (user.role !== "MANAGER") {
        console.log("User is not a manager:", user.role);
        return;
      }

      if (events.length === 0) {
        console.log("No events loaded yet, waiting...");
        return;
      }

      const eventToEdit = events.find((event) => event.id === targetEventId);
      console.log(
        "Event found for editing:",
        eventToEdit?.label || "NOT FOUND"
      );

      if (eventToEdit) {
        console.log("Setting up edit dialog...");
        setEventToEdit(eventToEdit);
        setEditDialogOpen(true);
        console.log("Edit dialog should now be open!");

        // Clear both URL parameter and sessionStorage
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("editEventId");
          // Clear URL without navigation if it has edit parameter
          if (editEventId) {
            const url = new URL(window.location.href);
            url.searchParams.delete("edit");
            window.history.replaceState({}, "", url.pathname);
          }
        }
      } else {
        console.log("Event not found in events list");
        console.log(
          "Available event IDs:",
          events.map((e) => e.id)
        );
      }
    }
  }, [searchParams, events, user, editDialogOpen]);

  const loadEvents = async () => {
    try {
      const allEvents = await EventService.getAllEvents();

      if (user?.role === "MANAGER") {
        // Managers see all events (including inactive)
        setEvents(allEvents);
      } else {
        // Regular users see only active events
        setEvents(allEvents.filter((event) => event.isActive));
      }
    } catch (error) {
      console.error("Error loading events:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditEvent = (event: EventData) => {
    setEventToEdit(event);
    setEditDialogOpen(true);
  };

  const handleCopyEvent = (event: EventData) => {
    // Prefill create dialog via sessionStorage flag to use existing dialog
    // Simpler: open Create dialog and pass initial data through component state
    // We'll store the event to edit in local state similar to edit flow
    // Reuse CreateEventDialog by using its initialData prop via a wrapper
    setEventToEdit(event);
    setCreateDialogOpen(true);
  };

  const handleDeleteEvent = (event: EventData) => {
    setEventToDelete(event);
    setDeleteDialogOpen(true);
  };

  const handleEventCreated = (created?: EventData | null) => {
    if (created?.id) {
      setCreateDialogOpen(false);
      setEventToEdit(null);
      router.push(`/events/${created.id}`);
    } else {
      loadEvents();
    }
  };

  const handleEventUpdated = () => {
    loadEvents();
  };

  const handleEditDialogClose = (open: boolean) => {
    console.log("handleEditDialogClose called with:", open);
    setEditDialogOpen(open);

    // Reset event to edit when dialog closes
    if (!open) {
      setEventToEdit(null);
    }
  };

  const handleEventDeleted = (deletedEventId: string) => {
    // Optimistically remove from UI to avoid cache delay
    setEvents((prev) => prev.filter((e) => e.id !== deletedEventId));
    // Also refresh to be safe (handles other side effects)
    loadEvents();
  };

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-48"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="h-80">
                  <CardContent className="p-6 space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto px-4 py-8">
        <EventsHeader
          user={user}
          onCreateEvent={() => setCreateDialogOpen(true)}
        />

        {events.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {user?.role === "MANAGER"
                  ? "No events created yet"
                  : "No events available"}
              </h3>
              <p className="text-gray-600">
                {user?.role === "MANAGER"
                  ? "Create your first event to get started."
                  : "Check back later for upcoming events."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onEdit={handleEditEvent}
                onDelete={handleDeleteEvent}
                onCopy={handleCopyEvent}
              />
            ))}
          </div>
        )}

        {/* Manager-only dialogs */}
        {user?.role === "MANAGER" && (
          <>
            <CreateEventDialog
              open={createDialogOpen}
              onOpenChange={setCreateDialogOpen}
              onEventCreated={handleEventCreated}
              initialData={
                eventToEdit
                  ? {
                      label: `${eventToEdit.label} (copy)`,
                      description: eventToEdit.description || "",
                      shortDescription: eventToEdit.shortDescription || "",
                      startDate: eventToEdit.startDate
                        ? eventToEdit.startDate.split("T")[0]
                        : "",
                      endDate: eventToEdit.endDate
                        ? eventToEdit.endDate.split("T")[0]
                        : "",
                      startTime: eventToEdit.startTime || "",
                      endTime: eventToEdit.endTime || "",
                      location: eventToEdit.location || "",
                      maxCapacity: eventToEdit.maxCapacity,
                      customFields: (eventToEdit.customFields || []).map(
                        (cf) => ({
                          label: cf.label,
                          controlType: cf.controlType,
                          isRequired: cf.isRequired,
                          options: cf.options,
                          order: cf.order,
                        })
                      ),
                    }
                  : undefined
              }
            />

            <EditEventDialog
              open={editDialogOpen}
              onOpenChange={handleEditDialogClose}
              event={eventToEdit}
              onEventUpdated={handleEventUpdated}
            />

            <DeleteEventDialog
              open={deleteDialogOpen}
              onOpenChange={setDeleteDialogOpen}
              event={eventToDelete}
              onEventDeleted={handleEventDeleted}
            />
          </>
        )}
      </div>
    </AuthenticatedLayout>
  );
}

export default function EventsPage() {
  return (
    <Suspense
      fallback={
        <AuthenticatedLayout>
          <div className="space-y-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E91E63] mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading events...</p>
              </div>
            </div>
          </div>
        </AuthenticatedLayout>
      }
    >
      <EventsPageContent />
    </Suspense>
  );
}
