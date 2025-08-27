"use client";

// Public view; no auth wrapper
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  ArrowLeft,
  UserCheck,
  UserX,
  Edit,
  Printer,
  Share2,
  Copy,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { EventService, EventData } from "@/services";
import { useAuthStore } from "@/lib/stores/authStore";
import { toast } from "sonner";
import {
  isEventPast,
  getEventStatus,
  getEventStatusVariant,
  getEventStatusClassName,
} from "@/lib/utils/eventStatus";
import { formatDateLong, formatTimeShort } from "@/lib/utils/dateTime";
import { shareEventLink } from "@/lib/utils/share";
import { CreateEventDialog } from "../components/CreateEventDialog";

export default function EventViewPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);

  // Registration form state
  const [registrationDialogOpen, setRegistrationDialogOpen] = useState(false);
  const [editRegistrationDialogOpen, setEditRegistrationDialogOpen] =
    useState(false);
  const [customFieldResponses, setCustomFieldResponses] = useState<
    Record<string, any>
  >({});
  const [editFieldResponses, setEditFieldResponses] = useState<
    Record<string, any>
  >({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const loadEvent = useCallback(async () => {
    try {
      setLoading(true);
      const eventData = await EventService.getEventById(params.id as string);
      setEvent(eventData);
    } catch (error) {
      toast.error("Failed to load event");
      console.error("Error loading event:", error);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (params.id) {
      loadEvent();
    }
  }, [params.id, loadEvent]);

  // (moved below after function declaration)

  const checkRegistrationStatus = useCallback(async () => {
    if (!user || !params.id) return;

    try {
      const registration = await EventService.getUserRegistration(
        params.id as string,
        user.id
      );
      setIsRegistered(!!registration);
      setRegistrationData(registration);

      // Pre-populate edit form with existing registration data
      if (registration && registration.customFieldResponses) {
        const responses: Record<string, any> = {};
        registration.customFieldResponses.forEach((response: any) => {
          try {
            // Try to parse JSON, fall back to string value
            responses[response.customFieldId] = JSON.parse(response.value);
          } catch {
            responses[response.customFieldId] = response.value;
          }
        });
        setEditFieldResponses(responses);
      }
    } catch (error) {
      console.error("Error checking registration status:", error);
    }
  }, [user?.id, params.id]);

  // Check registration status whenever user/params change
  useEffect(() => {
    checkRegistrationStatus();
  }, [checkRegistrationStatus]);

  const handleJoinEvent = async () => {
    if (!user || !event) return;

    // Check if event has custom fields that need to be filled
    const requiredFields =
      event.customFields?.filter((field) => field.isRequired) || [];

    if (requiredFields.length > 0) {
      // Open registration dialog to collect custom field data
      setCustomFieldResponses({});
      setFormErrors({});
      setRegistrationDialogOpen(true);
    } else {
      // No custom fields, register directly
      await processRegistration({});
    }
  };

  const processRegistration = async (fieldResponses: Record<string, any>) => {
    if (!user || !event) return;

    try {
      setRegistrationLoading(true);

      // Prepare registration data
      const registrationData = {
        userId: user.id,
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email,
        customFieldResponses: fieldResponses,
      };

      const success = await EventService.registerForEvent(
        event.id,
        registrationData
      );

      if (success) {
        setRegistrationDialogOpen(false);
        await loadEvent(); // Reload to update registration count
        await checkRegistrationStatus(); // Verify registration status from server
      }
    } catch (error) {
      console.error("Error joining event:", error);
    } finally {
      setRegistrationLoading(false);
    }
  };

  const handleEditRegistrationChange = (fieldId: string, value: any) => {
    setEditFieldResponses((prev) => ({
      ...prev,
      [fieldId]: value,
    }));

    // Clear error for this field if it exists
    if (formErrors[fieldId]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const handleViewEditRegistration = () => {
    if (!registrationData || !event) return;

    // Reset form errors
    setFormErrors({});

    // Pre-populate form with current registration data
    if (event.customFields && registrationData.customFieldResponses) {
      const responses: Record<string, any> = {};
      registrationData.customFieldResponses.forEach((response: any) => {
        try {
          responses[response.customFieldId] = JSON.parse(response.value);
        } catch {
          responses[response.customFieldId] = response.value;
        }
      });
      setEditFieldResponses(responses);
    }

    setEditRegistrationDialogOpen(true);
  };

  const validateEditCustomFields = () => {
    if (!event?.customFields) return true;

    const errors: Record<string, string> = {};

    event.customFields.forEach((field) => {
      if (field.isRequired) {
        const value = editFieldResponses[field.id!];

        if (
          !value ||
          (Array.isArray(value) && value.length === 0) ||
          value === ""
        ) {
          errors[field.id!] = `${field.label} is required`;
        }
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdateRegistration = async () => {
    if (!user || !event || !registrationData) return;

    if (!validateEditCustomFields()) {
      return;
    }

    try {
      setRegistrationLoading(true);

      // Prepare update data (only custom fields for now)
      const updateData = {
        customFieldResponses: editFieldResponses,
      };

      const updatedRegistration = await EventService.updateRegistration(
        event.id,
        user.id,
        updateData
      );

      if (updatedRegistration) {
        setEditRegistrationDialogOpen(false);
        await checkRegistrationStatus(); // Refresh registration data
      }
    } catch (error) {
      console.error("Error updating registration:", error);
    } finally {
      setRegistrationLoading(false);
    }
  };

  const handleCustomFieldChange = (fieldId: string, value: any) => {
    setCustomFieldResponses((prev) => ({
      ...prev,
      [fieldId]: value,
    }));

    // Clear error for this field if it exists
    if (formErrors[fieldId]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const validateCustomFields = () => {
    if (!event?.customFields) return true;

    const errors: Record<string, string> = {};

    event.customFields.forEach((field) => {
      if (field.isRequired) {
        const value = customFieldResponses[field.id!];

        if (
          !value ||
          (Array.isArray(value) && value.length === 0) ||
          value === ""
        ) {
          errors[field.id!] = `${field.label} is required`;
        }
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegistrationSubmit = () => {
    if (validateCustomFields()) {
      processRegistration(customFieldResponses);
    }
  };

  const renderCustomField = (field: any) => {
    const value = customFieldResponses[field.id] || "";
    const hasError = !!formErrors[field.id];

    switch (field.controlType) {
      case "text":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.id}
              value={value}
              onChange={(e) =>
                handleCustomFieldChange(field.id, e.target.value)
              }
              className={hasError ? "border-red-500" : ""}
            />
            {hasError && (
              <p className="text-sm text-red-500">{formErrors[field.id]}</p>
            )}
          </div>
        );

      case "textarea":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={field.id}
              value={value}
              onChange={(e) =>
                handleCustomFieldChange(field.id, e.target.value)
              }
              className={hasError ? "border-red-500" : ""}
            />
            {hasError && (
              <p className="text-sm text-red-500">{formErrors[field.id]}</p>
            )}
          </div>
        );

      case "toggle":
        return (
          <div key={field.id} className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id={field.id}
                checked={value === true}
                onCheckedChange={(checked) =>
                  handleCustomFieldChange(field.id, checked)
                }
              />
              <Label htmlFor={field.id}>
                {field.label}
                {field.isRequired && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </Label>
            </div>
            {hasError && (
              <p className="text-sm text-red-500">{formErrors[field.id]}</p>
            )}
          </div>
        );

      case "multiselect":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>
              {field.label}
              {field.isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select
              value={value}
              onValueChange={(selectedValue) =>
                handleCustomFieldChange(field.id, selectedValue)
              }
            >
              <SelectTrigger className={hasError ? "border-red-500" : ""}>
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option: string, index: number) => (
                  <SelectItem key={index} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasError && (
              <p className="text-sm text-red-500">{formErrors[field.id]}</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const renderEditCustomField = (field: any) => {
    const value = editFieldResponses[field.id] || "";
    const hasError = !!formErrors[field.id];

    switch (field.controlType) {
      case "text":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={`edit-${field.id}`}>
              {field.label}
              {field.isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={`edit-${field.id}`}
              value={value}
              onChange={(e) =>
                handleEditRegistrationChange(field.id, e.target.value)
              }
              className={hasError ? "border-red-500" : ""}
            />
            {hasError && (
              <p className="text-sm text-red-500">{formErrors[field.id]}</p>
            )}
          </div>
        );

      case "textarea":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={`edit-${field.id}`}>
              {field.label}
              {field.isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={`edit-${field.id}`}
              value={value}
              onChange={(e) =>
                handleEditRegistrationChange(field.id, e.target.value)
              }
              className={hasError ? "border-red-500" : ""}
            />
            {hasError && (
              <p className="text-sm text-red-500">{formErrors[field.id]}</p>
            )}
          </div>
        );

      case "toggle":
        return (
          <div key={field.id} className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`edit-${field.id}`}
                checked={value === true}
                onCheckedChange={(checked) =>
                  handleEditRegistrationChange(field.id, checked)
                }
              />
              <Label htmlFor={`edit-${field.id}`}>
                {field.label}
                {field.isRequired && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </Label>
            </div>
            {hasError && (
              <p className="text-sm text-red-500">{formErrors[field.id]}</p>
            )}
          </div>
        );

      case "multiselect":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={`edit-${field.id}`}>
              {field.label}
              {field.isRequired && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select
              value={value}
              onValueChange={(selectedValue) =>
                handleEditRegistrationChange(field.id, selectedValue)
              }
            >
              <SelectTrigger className={hasError ? "border-red-500" : ""}>
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option: string, index: number) => (
                  <SelectItem key={index} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasError && (
              <p className="text-sm text-red-500">{formErrors[field.id]}</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const handleUnjoinEvent = async () => {
    if (!user || !event) return;

    try {
      setRegistrationLoading(true);
      const success = await EventService.unregisterFromEvent(event.id, user.id);

      if (success) {
        await loadEvent(); // Reload to update registration count
        await checkRegistrationStatus(); // Verify registration status from server
      }
    } catch (error) {
      console.error("Error leaving event:", error);
    } finally {
      setRegistrationLoading(false);
    }
  };

  const formatDate = (dateString: string) => formatDateLong(dateString);
  const formatTime = (timeString: string) => formatTimeShort(timeString);

  const isEventFull = () => {
    if (!event?.maxCapacity) return false;
    return (event.registrationCount || 0) >= event.maxCapacity;
  };

  const canJoinEvent = () => {
    if (!user || !event) return false;
    if (isRegistered) return false;
    if (isEventPast(event)) return false;
    if (isEventFull()) return false;
    return true;
  };

  const canUnjoinEvent = () => {
    if (!user || !event) return false;
    if (!isRegistered) return false;
    if (isEventPast(event)) return false;
    return true;
  };

  const handlePrint = () => {
    if (!event) return;

    // Create a new window for printing just the event card
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Event: ${event.label}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 20px;
              background: white;
            }
            .event-card {
              max-width: 600px;
              margin: 0 auto;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 24px;
              background: white;
            }
            .event-title {
              font-size: 28px;
              font-weight: bold;
              color: #1f2937;
              margin-bottom: 12px;
            }
            .event-short-desc {
              font-size: 18px;
              color: #6b7280;
              margin-bottom: 20px;
            }
            .event-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 9999px;
              font-size: 12px;
              font-weight: 500;
              margin-bottom: 20px;
              ${
                isEventPast(event)
                  ? "background: #f3f4f6; color: #6b7280;"
                  : "background: #3b82f6; color: white;"
              }
            }
            .event-details {
              display: grid;
              gap: 16px;
              margin-bottom: 24px;
            }
            .detail-row {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .detail-icon {
              width: 20px;
              height: 20px;
              flex-shrink: 0;
            }
            .detail-content h4 {
              margin: 0 0 4px 0;
              font-weight: 600;
              color: #374151;
            }
            .detail-content p {
              margin: 0;
              font-size: 14px;
              color: #6b7280;
            }
            .event-description {
              margin-top: 24px;
              padding-top: 24px;
              border-top: 1px solid #e5e7eb;
            }
            .event-description h3 {
              font-size: 18px;
              font-weight: 600;
              color: #1f2937;
              margin: 0 0 12px 0;
            }
            .event-description-content {
              color: #374151;
              line-height: 1.6;
            }
            .organizer-section {
              margin-top: 24px;
              padding-top: 24px;
              border-top: 1px solid #e5e7eb;
            }
            .organizer-section h3 {
              font-size: 18px;
              font-weight: 600;
              color: #1f2937;
              margin: 0 0 12px 0;
            }
            .organizer-info {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .organizer-avatar {
              width: 40px;
              height: 40px;
              background: #f3f4f6;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 600;
              color: #6b7280;
            }
            .organizer-details h4 {
              margin: 0 0 4px 0;
              font-weight: 600;
              color: #1f2937;
            }
            .organizer-details p {
              margin: 0;
              font-size: 14px;
              color: #6b7280;
            }
            .registration-info {
              margin-top: 24px;
              padding-top: 24px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
            }
            .registration-count {
              font-size: 24px;
              font-weight: bold;
              color: #1f2937;
            }
            .registration-label {
              font-size: 14px;
              color: #6b7280;
            }
            .print-footer {
              margin-top: 32px;
              padding-top: 16px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              font-size: 12px;
              color: #9ca3af;
            }
            @media print {
              body { margin: 0; }
              .event-card { 
                border: none; 
                box-shadow: none; 
                margin: 0;
                max-width: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="event-card">
            <h1 class="event-title">${event.label}</h1>
            
            ${
              event.shortDescription
                ? `<p class="event-short-desc">${event.shortDescription}</p>`
                : ""
            }
            
            <div class="event-badge">
              ${isEventPast(event) ? "Past Event" : "Upcoming Event"}
            </div>
            
            <div class="event-details">
              <div class="detail-row">
                <svg class="detail-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: #3b82f6;">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div class="detail-content">
                  <h4>Date</h4>
                  <p>${formatDate(event.startDate)}${
      event.endDate && event.endDate !== event.startDate
        ? ` - ${formatDate(event.endDate)}`
        : ""
    }</p>
                </div>
              </div>
              
              ${
                event.startTime || event.endTime
                  ? `
                <div class="detail-row">
                  <svg class="detail-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: #10b981;">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div class="detail-content">
                    <h4>Time</h4>
                    <p>${event.startTime ? formatTime(event.startTime) : ""}${
                      event.startTime && event.endTime ? " - " : ""
                    }${event.endTime ? formatTime(event.endTime) : ""}</p>
                  </div>
                </div>
              `
                  : ""
              }
              
              ${
                event.location
                  ? `
                <div class="detail-row">
                  <svg class="detail-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: #ef4444;">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div class="detail-content">
                    <h4>Location</h4>
                    <p>${event.location}</p>
                  </div>
                </div>
              `
                  : ""
              }
              
              ${
                event.maxCapacity
                  ? `
                <div class="detail-row">
                  <svg class="detail-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: #8b5cf6;">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  <div class="detail-content">
                    <h4>Capacity</h4>
                    <p>${event.registrationCount || 0} / ${
                      event.maxCapacity
                    } registered</p>
                  </div>
                </div>
              `
                  : ""
              }
            </div>
            
            ${
              event.description
                ? `
              <div class="event-description">
                <h3>About This Event</h3>
                <div class="event-description-content">
                  ${
                    event.description.includes("<")
                      ? event.description
                      : event.description.replace(/\n/g, "<br>")
                  }
                </div>
              </div>
            `
                : ""
            }
            
            <div class="organizer-section">
              <h3>Organized by</h3>
              <div class="organizer-info">
                <div class="organizer-avatar">
                  ${
                    event.createdBy.firstName?.[0] ||
                    event.createdBy.email[0].toUpperCase()
                  }
                </div>
                <div class="organizer-details">
                  <h4>${
                    event.createdBy.firstName && event.createdBy.lastName
                      ? `${event.createdBy.firstName} ${event.createdBy.lastName}`
                      : event.createdBy.email
                  }</h4>
                  <p>${event.createdBy.email}</p>
                </div>
              </div>
            </div>
            
            <div class="registration-info">
              <div class="registration-count">${
                event.registrationCount || 0
              }</div>
              <div class="registration-label">${
                event.maxCapacity
                  ? `of ${event.maxCapacity} spots`
                  : "registered"
              }</div>
            </div>
            
            <div class="print-footer">
              Printed on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();

    // Wait for content to load, then print and close
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Event Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            The event you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div
          className={`flex items-center ${
            user ? "justify-between" : "justify-end"
          } mb-6`}
        >
          {user && (
            <Button
              variant="ghost"
              onClick={() => router.push("/events")}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Events
            </Button>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePrint}
              className="border-[#E91E63] text-[#E91E63] hover:bg-[#E91E63] hover:text-white"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            {user?.role === "MANAGER" && (
              <Button
                variant="outline"
                onClick={() => {
                  // Store edit intent in sessionStorage and navigate to events page
                  sessionStorage.setItem("editEventId", event.id);
                  router.push("/events");
                }}
                className="border-[#E91E63] text-[#E91E63] hover:bg-[#E91E63] hover:text-white"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Event
              </Button>
            )}
            {user?.role === "MANAGER" && (
              <Button
                variant="outline"
                onClick={() => setCopyDialogOpen(true)}
                className="border-[#E91E63] text-[#E91E63] hover:bg-[#E91E63] hover:text-white"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
            )}
            <Button
              variant="outline"
              onClick={async () => {
                const { result } = await shareEventLink(event.id, event.label);
                toast.success(
                  result === "shared" ? "Share dialog opened" : "Link copied"
                );
              }}
              className="border-[#E91E63] text-[#E91E63] hover:bg-[#E91E63] hover:text-white"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 flex items-start gap-3">
                    {event.avatarUrl && (
                      <div className="flex-shrink-0">
                        <Image
                          src={event.avatarUrl}
                          alt={event.label}
                          width={96}
                          height={96}
                          sizes="(min-width: 768px) 96px, 96px"
                          loading="eager"
                          priority
                          className="rounded-md object-cover w-24 h-24"
                        />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
                        {event.label}
                      </CardTitle>
                      {event.shortDescription && (
                        <p className="text-lg text-gray-600 mb-4">
                          {event.shortDescription}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={getEventStatusVariant(event)}
                    className={`ml-4 ${getEventStatusClassName(event)}`}
                  >
                    {getEventStatus(event)}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Event Details */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center text-gray-700">
                    <Calendar className="h-5 w-5 mr-3 text-blue-500" />
                    <div>
                      <p className="font-medium">Date</p>
                      <p className="text-sm text-gray-600">
                        {formatDate(event.startDate)}
                        {event.endDate && event.endDate !== event.startDate && (
                          <span> - {formatDate(event.endDate)}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {(event.startTime || event.endTime) && (
                    <div className="flex items-center text-gray-700">
                      <Clock className="h-5 w-5 mr-3 text-green-500" />
                      <div>
                        <p className="font-medium">Time</p>
                        <p className="text-sm text-gray-600">
                          {event.startTime && formatTime(event.startTime)}
                          {event.startTime && event.endTime && " - "}
                          {event.endTime && formatTime(event.endTime)}
                        </p>
                      </div>
                    </div>
                  )}

                  {event.location && (
                    <div className="flex items-center text-gray-700">
                      <MapPin className="h-5 w-5 mr-3 text-red-500" />
                      <div>
                        <p className="font-medium">Location</p>
                        <p className="text-sm text-gray-600">
                          {event.location}
                        </p>
                      </div>
                    </div>
                  )}

                  {event.maxCapacity && (
                    <div className="flex items-center text-gray-700">
                      <Users className="h-5 w-5 mr-3 text-purple-500" />
                      <div>
                        <p className="font-medium">Capacity</p>
                        <p className="text-sm text-gray-600">
                          {event.registrationCount || 0} / {event.maxCapacity}{" "}
                          registered
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Description */}
                {event.description && (
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      About This Event
                    </h3>
                    <div className="prose prose-gray max-w-none">
                      {/* Try to render as HTML, fall back to text if it fails */}
                      {event.description.includes("<") ? (
                        <div
                          dangerouslySetInnerHTML={{
                            __html: event.description,
                          }}
                        />
                      ) : (
                        <div className="whitespace-pre-wrap">
                          {event.description}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Organizer */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Organized by
                  </h3>
                  <div className="flex items-center">
                    <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {event.createdBy.firstName?.[0] ||
                          event.createdBy.email[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">
                        {event.createdBy.firstName && event.createdBy.lastName
                          ? `${event.createdBy.firstName} ${event.createdBy.lastName}`
                          : event.createdBy.email}
                      </p>
                      <p className="text-sm text-gray-600">
                        {event.createdBy.email}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6 print:space-y-4">
            {/* Registration Card */}
            <Card className="print:shadow-none print:border">
              <CardHeader>
                <CardTitle className="text-lg">Event Registration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {event.registrationCount || 0}
                  </div>
                  <div className="text-sm text-gray-600">
                    {event.maxCapacity
                      ? `of ${event.maxCapacity} spots`
                      : "registered"}
                  </div>
                </div>

                {/* Manager actions */}
                {user?.role === "MANAGER" && (
                  <div className="space-y-2 print:hidden">
                    <Button
                      variant="outline"
                      className="w-full border-[#E91E63] text-[#E91E63] hover:bg-[#E91E63] hover:text-white"
                      onClick={() =>
                        router.push(`/events/${event.id}/registrations`)
                      }
                    >
                      <Users className="h-4 w-4 mr-2" />
                      View All Registrations
                    </Button>
                  </div>
                )}

                {/* Hide interactive elements in print */}
                {user?.role === "REGULAR" && (
                  <div className="space-y-2 print:hidden">
                    {isRegistered ? (
                      <div className="text-center space-y-2">
                        <div className="flex items-center justify-center text-green-600">
                          <UserCheck className="h-5 w-5 mr-2" />
                          <span className="font-medium">
                            You're registered!
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={handleViewEditRegistration}
                          disabled={registrationLoading}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          {!isEventPast(event)
                            ? "Edit Registration"
                            : "View Registration"}
                        </Button>
                        {canUnjoinEvent() && (
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={handleUnjoinEvent}
                            disabled={registrationLoading}
                          >
                            {registrationLoading ? (
                              "Processing..."
                            ) : (
                              <>
                                <UserX className="h-4 w-4 mr-2" />
                                Leave Event
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {canJoinEvent() ? (
                          <Button
                            className="w-full"
                            onClick={handleJoinEvent}
                            disabled={registrationLoading}
                          >
                            {registrationLoading ? (
                              "Processing..."
                            ) : (
                              <>
                                <UserCheck className="h-4 w-4 mr-2" />
                                Join Event
                              </>
                            )}
                          </Button>
                        ) : (
                          <div className="text-center text-sm text-gray-600">
                            {isEventPast(event) &&
                              "This event has already passed"}
                            {isEventFull() &&
                              !isEventPast(event) &&
                              "This event is full"}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {user?.role === "MANAGER" && (
                  <div className="text-center text-sm text-gray-600 print:hidden">
                    As a manager, you can view event details and manage
                    registrations.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Event Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Event Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Status:</span>
                  <Badge variant={event.isActive ? "default" : "secondary"}>
                    {event.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Created:</span>
                  <span>{new Date(event.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Updated:</span>
                  <span>{new Date(event.updatedAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Registration Dialog */}
      <Dialog
        open={registrationDialogOpen}
        onOpenChange={setRegistrationDialogOpen}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Join Event: {event?.label}</DialogTitle>
            <DialogDescription>
              Please fill in the required information to register for this
              event.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* User Info Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Your Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>First Name</Label>
                  <Input value={user?.firstName || ""} disabled />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input value={user?.lastName || ""} disabled />
                </div>
                <div className="col-span-2">
                  <Label>Email</Label>
                  <Input value={user?.email || ""} disabled />
                </div>
              </div>
            </div>

            {/* Custom Fields Section */}
            {event?.customFields && event.customFields.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Additional Information</h3>
                <div className="space-y-4">
                  {event.customFields
                    .sort((a, b) => a.order - b.order)
                    .map((field) => renderCustomField(field))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRegistrationDialogOpen(false)}
              disabled={registrationLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRegistrationSubmit}
              disabled={registrationLoading}
            >
              {registrationLoading ? "Registering..." : "Join Event"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Registration Dialog */}
      <Dialog
        open={editRegistrationDialogOpen}
        onOpenChange={setEditRegistrationDialogOpen}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {!isEventPast(event!) ? "Edit Registration" : "View Registration"}
              : {event?.label}
            </DialogTitle>
            <DialogDescription>
              {!isEventPast(event!)
                ? "Update your registration information for this event."
                : "View your registration information for this event."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* User Info Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Your Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>First Name</Label>
                  <Input
                    value={registrationData?.firstName || user?.firstName || ""}
                    disabled
                  />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input
                    value={registrationData?.lastName || user?.lastName || ""}
                    disabled
                  />
                </div>
                <div className="col-span-2">
                  <Label>Email</Label>
                  <Input
                    value={registrationData?.email || user?.email || ""}
                    disabled
                  />
                </div>
                {registrationData?.phone && (
                  <div className="col-span-2">
                    <Label>Phone</Label>
                    <Input value={registrationData.phone} disabled />
                  </div>
                )}
              </div>
              {registrationData?.registeredAt && (
                <div className="text-sm text-gray-600">
                  Registered on:{" "}
                  {new Date(registrationData.registeredAt).toLocaleDateString()}
                </div>
              )}
            </div>

            {/* Custom Fields Section */}
            {event?.customFields && event.customFields.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">
                  {!isEventPast(event)
                    ? "Update Information"
                    : "Additional Information"}
                </h3>
                <div className="space-y-4">
                  {event.customFields
                    .sort((a, b) => a.order - b.order)
                    .map((field) =>
                      !isEventPast(event) ? (
                        renderEditCustomField(field)
                      ) : (
                        // Read-only view for past events
                        <div key={field.id} className="space-y-2">
                          <Label>{field.label}</Label>
                          <div className="p-2 bg-gray-50 rounded border">
                            {editFieldResponses[field.id!] || "No response"}
                          </div>
                        </div>
                      )
                    )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditRegistrationDialogOpen(false)}
              disabled={registrationLoading}
            >
              {!isEventPast(event!) ? "Cancel" : "Close"}
            </Button>
            {!isEventPast(event!) && (
              <Button
                onClick={handleUpdateRegistration}
                disabled={registrationLoading}
              >
                {registrationLoading ? "Updating..." : "Update Registration"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy Event (prefilled create) */}
      <CreateEventDialog
        open={copyDialogOpen}
        onOpenChange={setCopyDialogOpen}
        onEventCreated={(created) => {
          setCopyDialogOpen(false);
          if (created?.id) {
            router.push(`/events/${created.id}`);
          }
        }}
        initialData={
          event
            ? {
                label: `${event.label} (copy)`,
                description: event.description || "",
                shortDescription: event.shortDescription || "",
                startDate: event.startDate ? event.startDate.split("T")[0] : "",
                endDate: event.endDate ? event.endDate.split("T")[0] : "",
                startTime: event.startTime || "",
                endTime: event.endTime || "",
                location: event.location || "",
                maxCapacity: event.maxCapacity,
                customFields: (event.customFields || []).map((cf) => ({
                  label: cf.label,
                  controlType: cf.controlType,
                  isRequired: cf.isRequired,
                  options: cf.options,
                  order: cf.order,
                })),
              }
            : undefined
        }
      />
    </>
  );
}
