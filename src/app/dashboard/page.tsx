"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { formatDateShort } from "@/lib/utils/dateTime";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  Plus,
  BarChart3,
  UserCheck,
} from "lucide-react";
import { useAuthStore } from "@/lib/stores/authStore";
import apiClient from "@/lib/apiClient";
import { toast } from "sonner";
import type { EventData } from "@/services/eventService";

type Event = EventData;

interface Registration {
  id: string;
  status: "CONFIRMED" | "CANCELLED";
  event: {
    id: string;
    label: string;
    shortDescription?: string;
    avatarUrl?: string;
    startDate: string;
    endDate?: string;
    location?: string;
    status: "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  };
}

interface DashboardStats {
  totalEvents: number;
  upcomingEvents: number;
  completedEvents: number;
  totalRegistrations?: number;
  confirmedRegistrations?: number;
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalEvents: 0,
    upcomingEvents: 0,
    completedEvents: 0,
    totalRegistrations: 0,
    confirmedRegistrations: 0,
  });

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      if (user?.role === "MANAGER") {
        // Load events for managers
        const eventsResponse = await apiClient.get("/api/events");
        const eventsData = eventsResponse.data.events || [];
        setEvents(eventsData);

        // Calculate manager stats
        const totalEvents = eventsData.length;
        const nowTs = Date.now();
        const upcomingEvents = eventsData.filter((e: Event) => {
          const startTs = new Date(e.startDate).getTime();
          return e.isActive && startTs > nowTs;
        }).length;
        const completedEvents = eventsData.filter((e: Event) => {
          const endTs = new Date(e.endDate || e.startDate).getTime();
          return endTs < nowTs;
        }).length;

        // Calculate total registrations across all events
        const totalRegistrations = eventsData.reduce(
          (sum: number, event: Event) => {
            return sum + (event._count?.registrations || 0);
          },
          0
        );

        const confirmedRegistrations = totalRegistrations;

        setStats({
          totalEvents,
          upcomingEvents,
          completedEvents,
          totalRegistrations,
          confirmedRegistrations,
        });
      } else {
        // Load events and derive user's registrations from isUserRegistered flags
        const res = await apiClient.get("/api/events");
        const allEvents = res.data.events || [];
        const userRegistrations: Registration[] = allEvents
          .filter((event: any) => event.isUserRegistered)
          .map((event: any) => ({
            id: `${event.id}-self`,
            status: event.userRegistrationStatus || "CONFIRMED",
            event: {
              id: event.id,
              label: event.label,
              shortDescription: event.shortDescription,
              avatarUrl: event.avatarUrl,
              startDate: event.startDate,
              endDate: event.endDate,
              location: event.location,
              status: event.status || (event.isActive ? "ACTIVE" : "DRAFT"),
            },
          }));

        setRegistrations(userRegistrations);

        // Calculate user stats
        const totalEvents = userRegistrations.length;
        const now = new Date();

        const upcomingEvents = userRegistrations.filter((r) => {
          const eventStart = new Date(r.event.startDate);
          const isActive =
            r.event.status === "ACTIVE" || r.event.status === undefined;
          const isFuture = eventStart > now;
          const isConfirmed = r.status === "CONFIRMED";
          return isActive && isFuture && isConfirmed;
        }).length;

        const completedEvents = userRegistrations.filter((r) => {
          const eventStart = new Date(r.event.startDate);
          return r.event.status === "COMPLETED" || eventStart < now;
        }).length;

        const confirmedRegistrations = userRegistrations.filter(
          (r) => r.status === "CONFIRMED"
        ).length;

        setStats({
          totalEvents,
          upcomingEvents,
          completedEvents,
          confirmedRegistrations,
        });
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadDashboardData();
  }, [user, loadDashboardData]);

  const formatDate = (dateString: string) => formatDateShort(dateString);

  const getEventStatus = (event: Event | Registration["event"]) => {
    const now = new Date();
    const startDate = new Date(event.startDate);
    const endDate = event.endDate ? new Date(event.endDate) : startDate;

    // Prefer flags over status string
    if (!("status" in event)) {
      if (now > endDate) return "completed";
      if (now >= startDate && now <= endDate) return "ongoing";
      return event ? "upcoming" : "upcoming";
    }
    if ((event as any).status === "COMPLETED") return "completed";
    if ((event as any).status === "CANCELLED") return "cancelled";
    if ((event as any).status === "DRAFT") return "draft";
    if (now > endDate) return "completed";
    if (now >= startDate && now <= endDate) return "ongoing";
    return "upcoming";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "upcoming":
        return "bg-blue-100 text-blue-800";
      case "ongoing":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "draft":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E91E63] mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }
  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">
              {user?.role === "MANAGER"
                ? "Manage your events and view analytics"
                : "Track your event registrations and upcoming events"}
            </p>
          </div>
          {user?.role === "MANAGER" && (
            <Button
              onClick={() => router.push("/events")}
              className="bg-[#E91E63] hover:bg-[#C2185B] text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {user?.role === "MANAGER" ? (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Events
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalEvents}</div>
                  <p className="text-xs text-muted-foreground">
                    Events created by you
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Upcoming Events
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.upcomingEvents}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Active events coming up
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Registrations
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.totalRegistrations}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Across all your events
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Confirmed
                  </CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.confirmedRegistrations}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(stats.totalRegistrations || 0) > 0
                      ? `${Math.round(
                          ((stats.confirmedRegistrations || 0) /
                            (stats.totalRegistrations || 1)) *
                            100
                        )}% confirmation rate`
                      : "No registrations yet"}
                  </p>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    My Registrations
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalEvents}</div>
                  <p className="text-xs text-muted-foreground">
                    Events you've registered for
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Upcoming
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.upcomingEvents}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Events you'll attend
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Completed
                  </CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.completedEvents}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Events you've attended
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Participation Rate
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.totalEvents > 0
                      ? `${Math.round(
                          ((stats.confirmedRegistrations || 0) /
                            stats.totalEvents) *
                            100
                        )}%`
                      : "0%"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Confirmed vs total registrations
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Recent Events/Registrations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>
                {user?.role === "MANAGER"
                  ? "Recent Events"
                  : "My Registrations"}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {user?.role === "MANAGER"
                  ? "Your latest events and their status"
                  : "Your event registrations and their status"}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push("/events")}
              className="border-[#E91E63] text-[#E91E63] hover:bg-[#E91E63] hover:text-white"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {user?.role === "MANAGER" ? (
                events.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No events created yet</p>
                    <Button
                      onClick={() => router.push("/events")}
                      className="mt-4 bg-[#E91E63] hover:bg-[#C2185B] text-white"
                    >
                      Create Your First Event
                    </Button>
                  </div>
                ) : (
                  events.slice(0, 5).map((event) => {
                    const eventStatus = getEventStatus(event);
                    return (
                      <div
                        key={event.id}
                        className="flex items-center justify-between p-4 rounded-lg border hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => router.push(`/events/${event.id}`)}
                      >
                        <div className="flex items-center space-x-4">
                          {event.avatarUrl ? (
                            <Image
                              src={event.avatarUrl}
                              alt={event.label}
                              width={48}
                              height={48}
                              sizes="48px"
                              loading="lazy"
                              className="rounded-md object-cover w-12 h-12"
                            />
                          ) : (
                            <Calendar className="h-8 w-8 text-[#E91E63]" />
                          )}
                          <div>
                            <h3 className="font-medium">{event.label}</h3>
                            <p className="text-sm text-gray-600">
                              {event.shortDescription}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDate(event.startDate)}
                              {event.location && ` • ${event.location}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">
                            {event._count?.registrations || 0} registrations
                          </span>
                          <Badge className={getStatusColor(eventStatus)}>
                            {eventStatus}
                          </Badge>
                        </div>
                      </div>
                    );
                  })
                )
              ) : registrations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No event registrations yet</p>
                  <Button
                    onClick={() => router.push("/events")}
                    className="mt-4 bg-[#E91E63] hover:bg-[#C2185B] text-white"
                  >
                    Browse Events
                  </Button>
                </div>
              ) : (
                registrations.slice(0, 5).map((registration) => {
                  const eventStatus = getEventStatus(registration.event);
                  return (
                    <div
                      key={registration.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() =>
                        router.push(`/events/${registration.event.id}`)
                      }
                    >
                      <div className="flex items-center space-x-4">
                        {registration.event.avatarUrl ? (
                          <Image
                            src={registration.event.avatarUrl}
                            alt={registration.event.label}
                            width={48}
                            height={48}
                            sizes="48px"
                            loading="lazy"
                            className="rounded-md object-cover w-12 h-12"
                          />
                        ) : (
                          <Calendar className="h-8 w-8 text-[#E91E63]" />
                        )}
                        <div>
                          <h3 className="font-medium">
                            {registration.event.label}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {registration.event.shortDescription}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(registration.event.startDate)}
                            {registration.event.location &&
                              ` • ${registration.event.location}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant={
                            registration.status === "CONFIRMED"
                              ? "default"
                              : "secondary"
                          }
                          className={
                            registration.status === "CONFIRMED"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }
                        >
                          {registration.status === "CONFIRMED"
                            ? "Confirmed"
                            : "Cancelled"}
                        </Badge>
                        <Badge className={getStatusColor(eventStatus)}>
                          {eventStatus}
                        </Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
