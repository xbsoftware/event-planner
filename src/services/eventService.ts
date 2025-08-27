import apiClient from "@/lib/apiClient";

export interface EventCustomFieldData {
  id?: string;
  label: string;
  controlType: "text" | "textarea" | "toggle" | "multiselect";
  isRequired: boolean;
  options?: string[]; // For multiselect and toggle
  order: number;
}

export interface EventData {
  id: string;
  label: string;
  description?: string;
  shortDescription?: string;
  avatarUrl?: string;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  maxCapacity?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
  };
  customFields?: EventCustomFieldData[];
  registrationCount?: number;
  // New fields for user registration status
  isUserRegistered?: boolean;
  userRegistrationStatus?: string | null;
  _count?: { registrations: number };
}

export interface CreateEventData {
  label: string;
  description?: string;
  shortDescription?: string;
  avatarUrl?: string;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  maxCapacity?: number;
  customFields?: EventCustomFieldData[];
  currentUserRole: string;
}

export interface UpdateEventData {
  label?: string;
  description?: string;
  shortDescription?: string;
  avatarUrl?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  maxCapacity?: number;
  isActive?: boolean;
  customFields?: EventCustomFieldData[];
  currentUserRole: string;
}

export class EventService {
  private static baseUrl = "/api/events";

  /**
   * Fetch all events
   */
  static async getAllEvents(): Promise<EventData[]> {
    try {
      const response = await apiClient.get(this.baseUrl);
      return response.data.events || [];
    } catch (error) {
      console.error("Error fetching events:", error);
      const { toast } = await import("sonner");
      toast.error("Failed to fetch events");
      return [];
    }
  }

  /**
   * Get event by ID
   */
  static async getEventById(eventId: string): Promise<EventData | null> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${eventId}`);
      return response.data.event;
    } catch (error) {
      console.error("Error fetching event by ID:", error);
      const { toast } = await import("sonner");
      toast.error("Failed to fetch event");
      return null;
    }
  }

  /**
   * Create a new event (Manager only)
   */
  static async createEvent(
    eventData: CreateEventData
  ): Promise<EventData | null> {
    try {
      const response = await apiClient.post(this.baseUrl, eventData);
      const { toast } = await import("sonner");
      toast.success("Event created successfully!");
      return response.data.event;
    } catch (error: any) {
      console.error("Error creating event:", error);
      const { toast } = await import("sonner");
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to create event";
      toast.error(errorMessage);
      return null;
    }
  }

  /**
   * Update an event (Manager only)
   */
  static async updateEvent(
    eventId: string,
    eventData: UpdateEventData
  ): Promise<EventData | null> {
    try {
      const response = await apiClient.put(
        `${this.baseUrl}/${eventId}`,
        eventData
      );
      const { toast } = await import("sonner");
      toast.success("Event updated successfully!");
      return response.data.event;
    } catch (error: any) {
      console.error("Error updating event:", error);
      const { toast } = await import("sonner");
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to update event";
      toast.error(errorMessage);
      return null;
    }
  }

  /**
   * Delete an event (Manager only)
   */
  static async deleteEvent(
    eventId: string,
    currentUserRole: string
  ): Promise<boolean> {
    try {
      await apiClient.delete(`${this.baseUrl}/${eventId}`, {
        data: { currentUserRole },
      });
      const { toast } = await import("sonner");
      toast.success("Event deleted successfully!");
      return true;
    } catch (error: any) {
      console.error("Error deleting event:", error);
      const { toast } = await import("sonner");
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to delete event";
      toast.error(errorMessage);
      return false;
    }
  }

  /**
   * Check if user is registered for an event and get registration details
   */
  static async getUserRegistration(
    eventId: string,
    userId: string
  ): Promise<any | null> {
    try {
      const response = await apiClient.get(
        `${this.baseUrl}/${eventId}/registration/${userId}`
      );
      return response.data.isRegistered ? response.data.registration : null;
    } catch (error) {
      console.error("Error checking registration status:", error);
      return null;
    }
  }

  /**
   * Check if user is registered for an event (legacy method)
   */
  static async isUserRegistered(
    eventId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const response = await apiClient.get(
        `${this.baseUrl}/${eventId}/registration/${userId}`
      );
      return response.data.isRegistered || false;
    } catch (error) {
      console.error("Error checking registration status:", error);
      return false;
    }
  }

  /**
   * Update user registration for an event
   */
  static async updateRegistration(
    eventId: string,
    userId: string,
    updateData: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      customFieldResponses?: Record<string, any>;
    }
  ): Promise<any | null> {
    try {
      const response = await apiClient.put(
        `${this.baseUrl}/${eventId}/registration/${userId}`,
        updateData
      );
      const { toast } = await import("sonner");
      toast.success("Registration updated successfully!");
      return response.data.registration;
    } catch (error: any) {
      console.error("Error updating registration:", error);
      const { toast } = await import("sonner");
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to update registration";
      toast.error(errorMessage);
      return null;
    }
  }

  /**
   * Register user for an event
   */
  static async registerForEvent(
    eventId: string,
    userInfo: {
      userId?: string;
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      customFieldResponses?: Record<string, any>;
    }
  ): Promise<boolean> {
    try {
      await apiClient.post(`${this.baseUrl}/${eventId}/register`, userInfo);
      const { toast } = await import("sonner");
      toast.success("Successfully registered for event!");
      return true;
    } catch (error: any) {
      console.error("Error registering for event:", error);
      const { toast } = await import("sonner");
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to register for event";
      toast.error(errorMessage);
      return false;
    }
  }

  /**
   * Unregister user from an event
   */
  static async unregisterFromEvent(
    eventId: string,
    userId: string
  ): Promise<boolean> {
    try {
      await apiClient.delete(`${this.baseUrl}/${eventId}/unregister`, {
        data: { userId },
      });
      const { toast } = await import("sonner");
      toast.success("Successfully unregistered from event!");
      return true;
    } catch (error: any) {
      console.error("Error unregistering from event:", error);
      const { toast } = await import("sonner");
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to unregister from event";
      toast.error(errorMessage);
      return false;
    }
  }
}
