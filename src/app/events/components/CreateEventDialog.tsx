"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, X, GripVertical } from "lucide-react";
import {
  EventService,
  CreateEventData,
  EventCustomFieldData,
  EventData,
} from "@/services/eventService";
import { useAuthStore } from "@/lib/stores/authStore";
import { toast } from "sonner";

type CustomFieldType = "text" | "textarea" | "toggle" | "multiselect";

interface CustomFieldForm extends EventCustomFieldData {
  tempId: string; // For managing form state before saving
}

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventCreated: (created: EventData | null) => void;
  initialData?: Partial<CreateEventData> & {
    customFields?: EventCustomFieldData[];
  };
}

export function CreateEventDialog({
  open,
  onOpenChange,
  onEventCreated,
  initialData,
}: CreateEventDialogProps) {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const [newEvent, setNewEvent] = useState<CreateEventData>({
    label: "",
    description: "",
    shortDescription: "",
    avatarUrl: "",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    location: "",
    maxCapacity: undefined,
    customFields: [],
    currentUserRole: user?.role || "REGULAR",
  });

  // Custom Fields State
  const [customFields, setCustomFields] = useState<CustomFieldForm[]>([]);
  const [fieldCounter, setFieldCounter] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [existingUploads, setExistingUploads] = useState<
    { name: string; url: string }[]
  >([]);

  // Populate form when opening with initial data (e.g., Copy Event)
  useEffect(() => {
    if (open && initialData) {
      setNewEvent((prev) => ({
        ...prev,
        label: initialData.label || "",
        description: initialData.description || "",
        shortDescription: initialData.shortDescription || "",
        avatarUrl: initialData.avatarUrl || "",
        startDate: initialData.startDate || "",
        endDate: initialData.endDate || "",
        startTime: initialData.startTime || "",
        endTime: initialData.endTime || "",
        location: initialData.location || "",
        maxCapacity: initialData.maxCapacity,
        currentUserRole: user?.role || "REGULAR",
        customFields: [],
      }));
      const fields = (initialData.customFields || [])
        .map((f, index) => ({
          tempId: `field-${index}`,
          label: f.label,
          controlType: f.controlType,
          isRequired: Boolean(f.isRequired),
          options: f.options,
          order: typeof f.order === "number" ? f.order : index,
        }))
        .sort((a, b) => a.order - b.order);
      setCustomFields(fields);
      setFieldCounter(fields.length);
    }
  }, [open, initialData, user]);

  useEffect(() => {
    const loadUploads = async () => {
      try {
        const res = await fetch("/api/upload");
        const data = await res.json();
        if (res.ok) setExistingUploads(data.uploads || []);
      } catch {}
    };
    if (open) loadUploads();
  }, [open]);

  const resetForm = () => {
    setNewEvent({
      label: "",
      description: "",
      shortDescription: "",
      startDate: "",
      endDate: "",
      startTime: "",
      endTime: "",
      location: "",
      maxCapacity: undefined,
      customFields: [],
      currentUserRole: user?.role || "REGULAR",
    });
    setCustomFields([]);
    setFieldCounter(0);
  };

  const addCustomField = () => {
    const newField: CustomFieldForm = {
      tempId: `field-${fieldCounter}`,
      label: "",
      controlType: "text",
      isRequired: false,
      options: undefined,
      order: customFields.length,
    };
    setCustomFields([...customFields, newField]);
    setFieldCounter(fieldCounter + 1);
  };

  const updateCustomField = (
    tempId: string,
    updates: Partial<CustomFieldForm>
  ) => {
    setCustomFields((fields) =>
      fields.map((field) =>
        field.tempId === tempId ? { ...field, ...updates } : field
      )
    );
  };

  const removeCustomField = (tempId: string) => {
    setCustomFields((fields) =>
      fields
        .filter((field) => field.tempId !== tempId)
        .map((field, index) => ({ ...field, order: index }))
    );
  };

  const addFieldOption = (tempId: string) => {
    const field = customFields.find((f) => f.tempId === tempId);
    if (!field) return;

    const newOptions = [...(field.options || []), ""];
    updateCustomField(tempId, { options: newOptions });
  };

  const updateFieldOption = (
    tempId: string,
    optionIndex: number,
    value: string
  ) => {
    const field = customFields.find((f) => f.tempId === tempId);
    if (!field || !field.options) return;

    const newOptions = [...field.options];
    newOptions[optionIndex] = value;
    updateCustomField(tempId, { options: newOptions });
  };

  const removeFieldOption = (tempId: string, optionIndex: number) => {
    const field = customFields.find((f) => f.tempId === tempId);
    if (!field || !field.options) return;

    const newOptions = field.options.filter(
      (_, index) => index !== optionIndex
    );
    updateCustomField(tempId, { options: newOptions });
  };

  const handleCreate = async () => {
    if (!newEvent.label || !newEvent.startDate || !newEvent.endDate || !user) {
      toast.error("Please fill in required fields");
      return;
    }

    setLoading(true);
    try {
      const eventData = {
        ...newEvent,
        customFields: customFields.map((field, index) => ({
          label: field.label,
          controlType: field.controlType,
          isRequired: field.isRequired,
          options: field.options,
          order: index,
        })),
        currentUserRole: user.role,
      };
      const created = await EventService.createEvent(eventData);
      onOpenChange(false);
      resetForm();
      onEventCreated(created);
      toast.success("Event created successfully");
    } catch (error) {
      // Error is already handled by EventService
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) resetForm();
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
          <DialogDescription>
            Fill in the details to create a new event for your organization.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="label">Event Name *</Label>
            <Input
              id="label"
              value={newEvent.label}
              onChange={(e) =>
                setNewEvent({ ...newEvent, label: e.target.value })
              }
              placeholder="Enter event name"
            />
          </div>

          <div>
            <Label htmlFor="avatarUrl">Avatar Image URL</Label>
            <Input
              id="avatarUrl"
              value={newEvent.avatarUrl || ""}
              onChange={(e) =>
                setNewEvent({ ...newEvent, avatarUrl: e.target.value })
              }
              placeholder="https://... or /uploads/..."
            />
            <div className="mt-2 flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    setUploading(true);
                    const fd = new FormData();
                    fd.append("file", file);
                    const res = await fetch("/api/upload", {
                      method: "POST",
                      body: fd,
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || "Upload failed");
                    setNewEvent((prev) => ({ ...prev, avatarUrl: data.url }));
                  } catch (err: any) {
                    toast.error(err.message || "Upload failed");
                  } finally {
                    setUploading(false);
                  }
                }}
              />
              {uploading && (
                <span className="text-xs text-gray-500">Uploading...</span>
              )}
            </div>
            {existingUploads.length > 0 && (
              <div className="mt-2">
                <Label className="text-sm">Or pick from existing</Label>
                <div className="mt-1 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-40 overflow-auto p-1 border rounded">
                  {existingUploads.map((u) => (
                    <button
                      key={u.url}
                      type="button"
                      className={`relative h-16 rounded overflow-hidden border ${
                        newEvent.avatarUrl === u.url
                          ? "ring-2 ring-[#E91E63]"
                          : ""
                      }`}
                      onClick={() =>
                        setNewEvent((prev) => ({ ...prev, avatarUrl: u.url }))
                      }
                      title={u.name}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={u.url}
                        alt={u.name}
                        className="object-cover w-full h-full"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={newEvent.description}
              onChange={(e) =>
                setNewEvent({ ...newEvent, description: e.target.value })
              }
              placeholder="Enter detailed event description"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="shortDescription">Short Description</Label>
            <Textarea
              id="shortDescription"
              value={newEvent.shortDescription || ""}
              onChange={(e) =>
                setNewEvent({ ...newEvent, shortDescription: e.target.value })
              }
              placeholder="Enter brief description for event cards (optional)"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={newEvent.startDate}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, startDate: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                type="date"
                value={newEvent.endDate}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, endDate: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={newEvent.startTime}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, startTime: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={newEvent.endTime}
                onChange={(e) =>
                  setNewEvent({ ...newEvent, endTime: e.target.value })
                }
              />
            </div>
          </div>

          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={newEvent.location}
              onChange={(e) =>
                setNewEvent({ ...newEvent, location: e.target.value })
              }
              placeholder="Enter event location"
            />
          </div>

          <div>
            <Label htmlFor="maxCapacity">Maximum Attendees</Label>
            <Input
              id="maxCapacity"
              type="number"
              min="1"
              value={newEvent.maxCapacity || ""}
              onChange={(e) =>
                setNewEvent({
                  ...newEvent,
                  maxCapacity: e.target.value
                    ? parseInt(e.target.value)
                    : undefined,
                })
              }
              placeholder="Enter maximum number of attendees"
            />
          </div>

          {/* Custom Fields Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">
                Registration Form Fields
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCustomField}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Field
              </Button>
            </div>

            {customFields.length === 0 ? (
              <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                <p>No custom fields added yet.</p>
                <p className="text-sm">
                  Click "Add Field" to create registration form fields.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {customFields.map((field, index) => (
                  <div
                    key={field.tempId}
                    className="border rounded-lg p-4 space-y-4 bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">
                          Field {index + 1}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCustomField(field.tempId)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`field-label-${field.tempId}`}>
                          Field Label *
                        </Label>
                        <Input
                          id={`field-label-${field.tempId}`}
                          value={field.label}
                          onChange={(e) =>
                            updateCustomField(field.tempId, {
                              label: e.target.value,
                            })
                          }
                          placeholder="Enter field label"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`field-type-${field.tempId}`}>
                          Field Type
                        </Label>
                        <Select
                          value={field.controlType}
                          onValueChange={(value: CustomFieldType) =>
                            updateCustomField(field.tempId, {
                              controlType: value,
                              options:
                                value === "multiselect" || value === "toggle"
                                  ? [""]
                                  : undefined,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Text Input</SelectItem>
                            <SelectItem value="textarea">Textarea</SelectItem>
                            <SelectItem value="toggle">
                              Toggle (Yes/No)
                            </SelectItem>
                            <SelectItem value="multiselect">
                              Multiple Choice
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`field-required-${field.tempId}`}
                        checked={Boolean(field.isRequired)}
                        onCheckedChange={(checked) =>
                          updateCustomField(field.tempId, {
                            isRequired: !!checked,
                          })
                        }
                      />
                      <Label htmlFor={`field-required-${field.tempId}`}>
                        Required field
                      </Label>
                    </div>

                    {/* Options for multiselect and toggle */}
                    {(field.controlType === "multiselect" ||
                      field.controlType === "toggle") && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">
                            {field.controlType === "toggle"
                              ? "Options (Yes/No labels)"
                              : "Options"}
                          </Label>
                          {field.controlType === "multiselect" && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addFieldOption(field.tempId)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add Option
                            </Button>
                          )}
                        </div>
                        {field.options?.map((option, optionIndex) => (
                          <div
                            key={optionIndex}
                            className="flex items-center gap-2"
                          >
                            <Input
                              value={option}
                              onChange={(e) =>
                                updateFieldOption(
                                  field.tempId,
                                  optionIndex,
                                  e.target.value
                                )
                              }
                              placeholder={
                                field.controlType === "toggle"
                                  ? optionIndex === 0
                                    ? "Yes label"
                                    : "No label"
                                  : `Option ${optionIndex + 1}`
                              }
                            />
                            {field.controlType === "multiselect" &&
                              field.options &&
                              field.options.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    removeFieldOption(field.tempId, optionIndex)
                                  }
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                          </div>
                        ))}
                        {field.controlType === "toggle" &&
                          (!field.options || field.options.length < 2) && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updateCustomField(field.tempId, {
                                  options: ["Yes", "No"],
                                })
                              }
                            >
                              Set Default Yes/No
                            </Button>
                          )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={loading}
            className="bg-[#E91E63] hover:bg-[#C2185B] text-white"
          >
            {loading ? "Creating..." : "Create Event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
