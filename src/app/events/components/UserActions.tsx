"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { isEventPast } from "@/lib/utils/eventStatus";
import { EventData } from "@/services/eventService";

interface UserActionsProps {
  event: EventData;
}

export function UserActions({ event }: UserActionsProps) {
  const router = useRouter();

  const isEventFull = (event: EventData) => {
    if (!event.maxCapacity) return false;
    return (event.registrationCount || 0) >= event.maxCapacity;
  };

  const getButtonText = () => {
    if (isEventPast(event)) return "View";
    if (event.isUserRegistered) return "Registered";
    return "Join";
  };

  const isButtonDisabled = () => {
    if (isEventPast(event)) return false; // Can always view past events
    if (event.isUserRegistered) return false; // Can always view registered events
    return isEventFull(event); // Disable join if event is full
  };

  return (
    <Button
      variant={event.isUserRegistered ? "secondary" : "default"}
      onClick={() => router.push(`/events/${event.id}`)}
      disabled={isButtonDisabled()}
      className={
        event.isUserRegistered
          ? ""
          : "bg-[#E91E63] hover:bg-[#C2185B] text-white"
      }
      //onMouseDown={(e) => e.stopPropagation()}
      //onClickCapture={(e) => e.stopPropagation()}
    >
      {getButtonText()}
    </Button>
  );
}
