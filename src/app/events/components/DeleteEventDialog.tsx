"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
import { EventService, EventData } from "@/services/eventService";
import { useAuthStore } from "@/lib/stores/authStore";
import { toast } from "sonner";

interface DeleteEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: EventData | null;
  onEventDeleted: (deletedEventId: string) => void;
}

export function DeleteEventDialog({
  open,
  onOpenChange,
  event,
  onEventDeleted,
}: DeleteEventDialogProps) {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!event || !user) return;

    setLoading(true);
    try {
      const success = await EventService.deleteEvent(event.id, user.role);
      if (success) {
        onOpenChange(false);
        onEventDeleted(event.id);
        toast.success("Event deleted successfully");
      }
    } catch (error) {
      // Error is already handled by EventService
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <DialogTitle>Delete Event</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this event?
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {event && (
          <div className="py-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">{event.label}</h4>
              <p className="text-sm text-gray-600">
                {event.shortDescription ||
                  event.description ||
                  "No description available"}
              </p>
              {event.registrationCount && event.registrationCount > 0 && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> This event has{" "}
                    {event.registrationCount} registered attendee
                    {event.registrationCount > 1 ? "s" : ""}. Deleting this
                    event will remove all registrations.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={loading}
            className="bg-[#E91E63] hover:bg-[#C2185B] text-white"
          >
            {loading ? "Deleting..." : "Delete Event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
