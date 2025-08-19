"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users } from "lucide-react";
import { EventData } from "@/services/eventService";
import { getDateTimeInfo } from "@/lib/utils/dateTime";
import { ManagerActions } from "./ManagerActions";
import { UserActions } from "./UserActions";
import { useAuthStore } from "@/lib/stores/authStore";
import { useRouter } from "next/navigation";
import {
  getEventStatusVariant,
  getEventStatusClassName,
  isEventPast,
  isEventRunning,
} from "@/lib/utils/eventStatus";

interface EventCardProps {
  event: EventData;
  onEdit: (event: EventData) => void;
  onDelete: (event: EventData) => void;
  onCopy?: (event: EventData) => void;
}

export function EventCard({ event, onEdit, onDelete, onCopy }: EventCardProps) {
  const { user } = useAuthStore();
  const router = useRouter();

  const dateTimeRange = getDateTimeInfo(event);

  const isPastEvent = isEventPast(event);
  const isRunningEvent = isEventRunning(event);
  const registrationCount = event.registrationCount || 0;
  const badgeText = isPastEvent
    ? `Past: Attended ${registrationCount} people`
    : isRunningEvent
    ? `Running: ${registrationCount} people`
    : `Upcoming: Registered ${registrationCount} people`;

  return (
    <Card
      className={`h-full flex flex-col ${
        !event.isActive ? "opacity-60" : ""
      } cursor-pointer hover:shadow-md transition-shadow`}
      onClick={() => router.push(`/events/${event.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(`/events/${event.id}`);
        }
      }}
    >
      <CardContent className="p-6 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
              {event.label}
            </h3>
            {event.shortDescription && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {event.shortDescription}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end space-y-1 ml-4">
            <Badge
              variant={getEventStatusVariant(event)}
              className={getEventStatusClassName(event)}
            >
              {badgeText}
            </Badge>
            {!event.isActive && <Badge variant="destructive">Inactive</Badge>}
          </div>
        </div>

        {/* Event Details - Flex-grow to take available space */}
        <div className="space-y-2 flex-1">
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{dateTimeRange}</span>
          </div>

          {event.location && (
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          )}

          {event.maxCapacity && (
            <div className="flex items-center text-sm text-gray-600">
              <Users className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>
                {event.registrationCount || 0} / {event.maxCapacity} registered
              </span>
            </div>
          )}
        </div>

        {/* Actions - Fixed at bottom with mt-auto */}
        <div className="mt-auto pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {isPastEvent && "Event completed"}
              {!isPastEvent &&
                event.maxCapacity &&
                (event.registrationCount || 0) >= event.maxCapacity &&
                "Event full"}
            </div>

            {user?.role === "MANAGER" ? (
              <ManagerActions
                event={event}
                onEdit={onEdit}
                onDelete={onDelete}
                onCopy={onCopy}
                compact
              />
            ) : (
              <UserActions event={event} />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
