'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, X, GripVertical } from 'lucide-react'
import { EventService, EventData, EventCustomFieldData } from '@/services/eventService'
import { useAuthStore } from '@/lib/stores/authStore'
import { toast } from 'sonner'

type CustomFieldType = 'text' | 'textarea' | 'toggle' | 'multiselect'

interface CustomFieldForm extends EventCustomFieldData {
  tempId: string // For managing form state before saving
}

interface EditEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: EventData | null
  onEventUpdated: () => void
}

export function EditEventDialog({ open, onOpenChange, event, onEventUpdated }: EditEventDialogProps) {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  
  const [editEvent, setEditEvent] = useState({
    label: '',
    description: '',
    shortDescription: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    location: '',
    maxCapacity: undefined as number | undefined,
    currentUserRole: user?.role || 'REGULAR'
  })

  // Custom Fields State
  const [customFields, setCustomFields] = useState<CustomFieldForm[]>([])
  const [fieldCounter, setFieldCounter] = useState(0)

  useEffect(() => {
    if (event) {
      setEditEvent({
        label: event.label,
        description: event.description || '',
        shortDescription: event.shortDescription || '',
        startDate: event.startDate.split('T')[0],
        endDate: event.endDate ? event.endDate.split('T')[0] : '',
        startTime: event.startTime || '',
        endTime: event.endTime || '',
        location: event.location || '',
        maxCapacity: event.maxCapacity,
        currentUserRole: user?.role || 'REGULAR'
      })

      // Convert existing custom fields to form state
      if (event.customFields) {
        const formFields = event.customFields.map((field, index) => ({
          ...field,
          tempId: `existing-${field.id || index}`,
          order: index
        }))
        setCustomFields(formFields)
        setFieldCounter(formFields.length)
      } else {
        setCustomFields([])
        setFieldCounter(0)
      }
    }
  }, [event, user])

  const resetForm = () => {
    setEditEvent({
      label: '',
      description: '',
      shortDescription: '',
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
      location: '',
      maxCapacity: undefined,
      currentUserRole: user?.role || 'REGULAR'
    })
    setCustomFields([])
    setFieldCounter(0)
  }

  const addCustomField = () => {
    const newField: CustomFieldForm = {
      tempId: `field-${fieldCounter}`,
      label: '',
      controlType: 'text',
      isRequired: false,
      options: undefined,
      order: customFields.length
    }
    setCustomFields([...customFields, newField])
    setFieldCounter(fieldCounter + 1)
  }

  const updateCustomField = (tempId: string, updates: Partial<CustomFieldForm>) => {
    setCustomFields(fields => 
      fields.map(field => 
        field.tempId === tempId ? { ...field, ...updates } : field
      )
    )
  }

  const removeCustomField = (tempId: string) => {
    setCustomFields(fields => 
      fields.filter(field => field.tempId !== tempId)
        .map((field, index) => ({ ...field, order: index }))
    )
  }

  const addFieldOption = (tempId: string) => {
    const field = customFields.find(f => f.tempId === tempId)
    if (!field) return

    const newOptions = [...(field.options || []), '']
    updateCustomField(tempId, { options: newOptions })
  }

  const updateFieldOption = (tempId: string, optionIndex: number, value: string) => {
    const field = customFields.find(f => f.tempId === tempId)
    if (!field || !field.options) return

    const newOptions = [...field.options]
    newOptions[optionIndex] = value
    updateCustomField(tempId, { options: newOptions })
  }

  const removeFieldOption = (tempId: string, optionIndex: number) => {
    const field = customFields.find(f => f.tempId === tempId)
    if (!field || !field.options) return

    const newOptions = field.options.filter((_, index) => index !== optionIndex)
    updateCustomField(tempId, { options: newOptions })
  }

  const handleUpdate = async () => {
    if (!editEvent.label || !editEvent.startDate || !editEvent.endDate || !user || !event) {
      toast.error('Please fill in required fields')
      return
    }

    setLoading(true)
    try {
      const eventData = {
        ...editEvent,
        customFields: customFields.map((field, index) => ({
          id: field.id, // Keep existing ID if it exists
          label: field.label,
          controlType: field.controlType,
          isRequired: field.isRequired,
          options: field.options,
          order: index
        })),
        currentUserRole: user.role
      }
      await EventService.updateEvent(event.id, eventData)
      onOpenChange(false)
      resetForm()
      onEventUpdated()
      toast.success('Event updated successfully')
    } catch (error) {
      // Error is already handled by EventService
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen)
      if (!isOpen) resetForm()
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
          <DialogDescription>
            Update the event details and registration form fields.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-label">Event Name *</Label>
            <Input
              id="edit-label"
              value={editEvent.label}
              onChange={(e) => setEditEvent({ ...editEvent, label: e.target.value })}
              placeholder="Enter event name"
            />
          </div>

          <div>
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={editEvent.description}
              onChange={(e) => setEditEvent({ ...editEvent, description: e.target.value })}
              placeholder="Enter detailed event description"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="edit-shortDescription">Short Description</Label>
            <Textarea
              id="edit-shortDescription"
              value={editEvent.shortDescription || ''}
              onChange={(e) => setEditEvent({ ...editEvent, shortDescription: e.target.value })}
              placeholder="Enter brief description for event cards (optional)"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-startDate">Start Date *</Label>
              <Input
                id="edit-startDate"
                type="date"
                value={editEvent.startDate}
                onChange={(e) => setEditEvent({ ...editEvent, startDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-endDate">End Date *</Label>
              <Input
                id="edit-endDate"
                type="date"
                value={editEvent.endDate}
                onChange={(e) => setEditEvent({ ...editEvent, endDate: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-startTime">Start Time</Label>
              <Input
                id="edit-startTime"
                type="time"
                value={editEvent.startTime}
                onChange={(e) => setEditEvent({ ...editEvent, startTime: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-endTime">End Time</Label>
              <Input
                id="edit-endTime"
                type="time"
                value={editEvent.endTime}
                onChange={(e) => setEditEvent({ ...editEvent, endTime: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="edit-location">Location</Label>
            <Input
              id="edit-location"
              value={editEvent.location}
              onChange={(e) => setEditEvent({ ...editEvent, location: e.target.value })}
              placeholder="Enter event location"
            />
          </div>

          <div>
            <Label htmlFor="edit-maxCapacity">Maximum Attendees</Label>
            <Input
              id="edit-maxCapacity"
              type="number"
              min="1"
              value={editEvent.maxCapacity || ''}
              onChange={(e) => setEditEvent({ 
                ...editEvent, 
                maxCapacity: e.target.value ? parseInt(e.target.value) : undefined 
              })}
              placeholder="Enter maximum number of attendees"
            />
          </div>

          {/* Custom Fields Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Registration Form Fields</Label>
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
                <p className="text-sm">Click "Add Field" to create registration form fields.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {customFields.map((field, index) => (
                  <div key={field.tempId} className="border rounded-lg p-4 space-y-4 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">Field {index + 1}</span>
                        {field.id && (
                          <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                            Existing
                          </span>
                        )}
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
                        <Label htmlFor={`edit-field-label-${field.tempId}`}>Field Label *</Label>
                        <Input
                          id={`edit-field-label-${field.tempId}`}
                          value={field.label}
                          onChange={(e) => updateCustomField(field.tempId, { label: e.target.value })}
                          placeholder="Enter field label"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`edit-field-type-${field.tempId}`}>Field Type</Label>
                        <Select 
                          value={field.controlType} 
                          onValueChange={(value: CustomFieldType) => 
                            updateCustomField(field.tempId, { 
                              controlType: value,
                              options: value === 'multiselect' || value === 'toggle' ? 
                                (field.options && field.options.length > 0 ? field.options : ['']) : 
                                undefined
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Text Input</SelectItem>
                            <SelectItem value="textarea">Textarea</SelectItem>
                            <SelectItem value="toggle">Toggle (Yes/No)</SelectItem>
                            <SelectItem value="multiselect">Multiple Choice</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`edit-field-required-${field.tempId}`}
                        checked={Boolean(field.isRequired)}
                        onCheckedChange={(checked) => 
                          updateCustomField(field.tempId, { isRequired: !!checked })
                        }
                      />
                      <Label htmlFor={`edit-field-required-${field.tempId}`}>Required field</Label>
                    </div>

                    {/* Options for multiselect and toggle */}
                    {(field.controlType === 'multiselect' || field.controlType === 'toggle') && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">
                            {field.controlType === 'toggle' ? 'Options (Yes/No labels)' : 'Options'}
                          </Label>
                          {field.controlType === 'multiselect' && (
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
                          <div key={optionIndex} className="flex items-center gap-2">
                            <Input
                              value={option}
                              onChange={(e) => updateFieldOption(field.tempId, optionIndex, e.target.value)}
                              placeholder={
                                field.controlType === 'toggle' 
                                  ? optionIndex === 0 ? 'Yes label' : 'No label'
                                  : `Option ${optionIndex + 1}`
                              }
                            />
                            {field.controlType === 'multiselect' && field.options && field.options.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFieldOption(field.tempId, optionIndex)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        {field.controlType === 'toggle' && (!field.options || field.options.length < 2) && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => updateCustomField(field.tempId, { 
                              options: ['Yes', 'No'] 
                            })}
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
          <Button onClick={handleUpdate} disabled={loading} className="bg-[#E91E63] hover:bg-[#C2185B] text-white">
            {loading ? 'Updating...' : 'Update Event'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
