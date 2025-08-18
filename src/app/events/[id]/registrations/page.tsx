'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ArrowLeft, UserCheck, UserX, Users, Calendar, Eye, Download } from 'lucide-react'
import AuthenticatedLayout from '@/components/AuthenticatedLayout'
import { useAuthStore } from '@/lib/stores/authStore'
import { toast } from 'sonner'
import apiClient from '@/lib/apiClient'
import * as XLSX from 'xlsx'

interface Registration {
  id: string
  userId: string
  firstName: string
  lastName: string
  email: string
  registeredAt: string
  status: 'CONFIRMED' | 'CANCELLED'
  customFieldResponses?: Array<{
    customFieldId: string
    value: string
    customField: {
      label: string
      controlType: string
    }
  }>
}

interface Event {
  id: string
  label: string
  shortDescription?: string
  startDate: string
  endDate?: string
  location?: string
  maxRegistrations?: number
}

export default function EventRegistrationsPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuthStore()
  const eventId = params.id as string
  
  const [event, setEvent] = useState<Event | null>(null)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [customFields, setCustomFields] = useState<Array<{
    id: string
    label: string
    controlType: string
  }>>([])

  useEffect(() => {
    if (!user) return
    
    // Redirect if not manager
    if (user.role !== 'MANAGER') {
      router.push('/dashboard')
      return
    }
    
    loadEventAndRegistrations()
  }, [user, router, eventId])

  const loadEventAndRegistrations = async () => {
    try {
      setLoading(true)
      
      // Load event details
      const eventResponse = await apiClient.get(`/api/events/${eventId}`)
      const eventData = eventResponse.data.event
      setEvent(eventData)
      
      // Extract custom fields from event data
      if (eventData.customFields) {
        setCustomFields(eventData.customFields.sort((a: any, b: any) => a.order - b.order))
      }
      
      // Load registrations
      const registrationsResponse = await apiClient.get(`/api/events/${eventId}/registrations`)
      setRegistrations(registrationsResponse.data.registrations || [])
    } catch (error) {
      console.error('Error loading event and registrations:', error)
      toast.error('Failed to load event registrations')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleRegistration = async (registrationId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'CONFIRMED' ? 'CANCELLED' : 'CONFIRMED'
      
      await apiClient.patch(`/api/events/${eventId}/manage/${registrationId}`, {
        status: newStatus
      })
      
      toast.success(`Registration ${newStatus === 'CONFIRMED' ? 'resumed' : 'cancelled'} successfully`)
      await loadEventAndRegistrations()
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to update registration'
      toast.error(errorMessage)
    }
  }

  const getRegistrationCount = () => {
    const activeCount = registrations.filter(r => r.status === 'CONFIRMED').length
    const totalCount = registrations.length
    return { activeCount, totalCount }
  }

  const exportToExcel = () => {
    if (!event) return

    // Filter only confirmed registrations
    const confirmedRegistrations = registrations.filter(r => r.status === 'CONFIRMED')
    
    if (confirmedRegistrations.length === 0) {
      toast.error('No confirmed registrations to export')
      return
    }

    // Create headers
    const headers = ['First Name', 'Last Name']
    customFields.forEach(field => {
      headers.push(field.label)
    })

    // Create data rows
    const data = [headers] // First row is headers
    
    confirmedRegistrations.forEach(registration => {
      const row = [registration.firstName, registration.lastName]
      
      // Add custom field values
      customFields.forEach(field => {
        let value = getCustomFieldValue(registration, field.id)
        
        // Convert value to string and handle special cases
        if (value === null || value === undefined) {
          value = ''
        } else if (typeof value === 'object') {
          value = JSON.stringify(value)
        } else {
          value = value.toString()
        }
        
        row.push(value)
      })
      
      data.push(row)
    })

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.aoa_to_sheet(data)
    
    // Auto-size columns
    const colWidths = headers.map((header, index) => {
      const maxLength = Math.max(
        header.length,
        ...data.slice(1).map(row => (row[index] || '').toString().length)
      )
      return { wch: Math.min(Math.max(maxLength + 2, 10), 50) }
    })
    worksheet['!cols'] = colWidths

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Registrations')

    // Generate filename from event label (sanitize filename)
    const sanitizedLabel = event.label.replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, '_').toLowerCase()
    const filename = `${sanitizedLabel}_registrations.xlsx`
    
    // Save file
    XLSX.writeFile(workbook, filename)
    
    toast.success(`Exported ${confirmedRegistrations.length} confirmed registrations to ${filename}`)
  }

  const getCustomFieldValue = (registration: Registration, fieldId: string) => {
    const response = registration.customFieldResponses?.find(r => r.customFieldId === fieldId)
    if (!response) return '-'
    
    // Find the custom field definition to get its type and options
    const field = customFields.find(f => f.id === fieldId)
    
    try {
      // Try to parse JSON for complex values
      const parsed = JSON.parse(response.value)
      if (Array.isArray(parsed)) {
        return parsed.join(', ')
      }
      
      // Handle toggle fields specifically
      if (field?.controlType === 'toggle') {
        // Get options from the field, defaulting to ['Yes', 'No']
        const fieldOptions = (field as any).options || ['Yes', 'No']
        if (typeof parsed === 'boolean') {
          return parsed ? fieldOptions[0] : fieldOptions[1]
        }
        // Handle string boolean values
        if (parsed === 'true' || parsed === true) return fieldOptions[0]
        if (parsed === 'false' || parsed === false) return fieldOptions[1]
      }
      
      return parsed
    } catch {
      // Handle non-JSON values
      const value = response.value
      
      // Handle toggle fields for string values
      if (field?.controlType === 'toggle') {
        const fieldOptions = (field as any).options || ['Yes', 'No']
        if (value === 'true') return fieldOptions[0]
        if (value === 'false') return fieldOptions[1]
      }
      
      // Return as string if not JSON
      return value || '-'
    }
  }

  const renderCustomFieldValue = (registration: Registration, field: any) => {
    const value = getCustomFieldValue(registration, field.id)
    
    // Handle text and textarea fields with potential long content
    if ((field.controlType === 'text' || field.controlType === 'textarea') && typeof value === 'string') {
      const maxLength = 40 // Reduced from 50 to leave more space for the icon
      const isLong = value.length > maxLength
      
      if (isLong) {
        const truncated = value.substring(0, maxLength) + '...'
        return (
          <div className="w-full">
            {/* Desktop/Tablet layout */}
            <div className="hidden sm:flex items-start gap-1 min-w-0">
              <span 
                title={value} 
                className="cursor-help text-sm truncate flex-1 min-w-0"
              >
                {truncated}
              </span>
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-5 w-5 p-0 text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5"
                    title="View full text"
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{field.label}</DialogTitle>
                  </DialogHeader>
                  <div className="mt-4">
                    <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                      <p className="text-sm whitespace-pre-wrap break-words">{value}</p>
                    </div>
                    <div className="mt-4 text-xs text-gray-500">
                      User: {registration.firstName} {registration.lastName}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            {/* Mobile layout - stacked */}
            <div className="sm:hidden">
              <div className="text-xs text-gray-500 mb-1">{truncated}</div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-6 text-xs px-2 text-gray-600"
                  >
                    View
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{field.label}</DialogTitle>
                  </DialogHeader>
                  <div className="mt-4">
                    <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                      <p className="text-sm whitespace-pre-wrap break-words">{value}</p>
                    </div>
                    <div className="mt-4 text-xs text-gray-500">
                      User: {registration.firstName} {registration.lastName}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )
      }
    }
    
    return <span className="text-sm">{value}</span>
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading registrations...</div>
        </div>
      </AuthenticatedLayout>
    )
  }

  if (!event) {
    return (
      <AuthenticatedLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Event not found</div>
        </div>
      </AuthenticatedLayout>
    )
  }

  const { activeCount, totalCount } = getRegistrationCount()

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost" 
            onClick={() => {
              console.log('eventId:', eventId)
              console.log('Navigating to:', `/events/${eventId}`)
              router.replace(`/events/${eventId}`)
            }}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Event
          </Button>
        </div>

        {/* Event Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {event.label}
            </CardTitle>
            {event.shortDescription && (
              <p className="text-gray-600">{event.shortDescription}</p>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="text-sm">
                  <strong>{activeCount}</strong> active registrations
                </span>
              </div>
              <div className="flex items-center gap-2">
                <UserX className="h-4 w-4 text-gray-500" />
                <span className="text-sm">
                  <strong>{totalCount - activeCount}</strong> cancelled
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-green-500" />
                <span className="text-sm">
                  {formatDate(event.startDate)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Registrations Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Event Registrations ({totalCount})</CardTitle>
              <Button
                onClick={exportToExcel}
                variant="outline"
                size="sm"
                className="border-[#E91E63] text-[#E91E63] hover:bg-[#E91E63] hover:text-white"
                disabled={registrations.filter(r => r.status === 'CONFIRMED').length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Confirmed
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {registrations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No registrations yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">Name</TableHead>
                      <TableHead className="min-w-[200px]">Email</TableHead>
                      <TableHead className="min-w-[120px]">Registered At</TableHead>
                      {customFields.map((field) => (
                        <TableHead key={field.id} className={
                          field.controlType === 'text' || field.controlType === 'textarea' 
                            ? "min-w-[140px] max-w-[200px]" 
                            : "max-w-xs min-w-[100px]"
                        }>
                          {field.label}
                          {(field.controlType === 'text' || field.controlType === 'textarea') && (
                            <span className="text-xs text-gray-400 ml-1" title="Long text may be truncated">*</span>
                          )}
                        </TableHead>
                      ))}
                      <TableHead className="min-w-[100px]">Status</TableHead>
                      <TableHead className="text-right min-w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {registrations.map((registration) => (
                    <TableRow key={registration.id}>
                      <TableCell className="font-medium">
                        {registration.firstName} {registration.lastName}
                      </TableCell>
                      <TableCell>{registration.email}</TableCell>
                      <TableCell>{formatDate(registration.registeredAt)}</TableCell>
                      {customFields.map((field) => (
                        <TableCell key={field.id} className={
                          field.controlType === 'text' || field.controlType === 'textarea'
                            ? "min-w-[140px] max-w-[200px] p-2"
                            : "max-w-xs p-2"
                        }>
                          {renderCustomFieldValue(registration, field)}
                        </TableCell>
                      ))}
                      <TableCell>
                        <Badge 
                          variant={registration.status === 'CONFIRMED' ? 'default' : 'secondary'}
                          className={registration.status === 'CONFIRMED' 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : 'bg-gray-100 text-gray-800'
                          }
                        >
                          {registration.status === 'CONFIRMED' ? 'Confirmed' : 'Cancelled'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleRegistration(registration.id, registration.status)}
                          className={registration.status === 'CONFIRMED'
                            ? 'border-[#E91E63] text-[#E91E63] hover:bg-[#E91E63] hover:text-white'
                            : 'border-green-500 text-green-600 hover:bg-green-500 hover:text-white'
                          }
                        >
                          {registration.status === 'CONFIRMED' ? (
                            <>
                              <UserX className="h-4 w-4 mr-1" />
                              Cancel
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-4 w-4 mr-1" />
                              Resume
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  )
}
