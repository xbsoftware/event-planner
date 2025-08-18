import { EventData } from '@/services'

export const isEventPast = (event: EventData): boolean => {
  const now = new Date()
  const startDate = new Date(event.startDate)
  
  // If there's an end date, check if end date has passed
  if (event.endDate) {
    const endDate = new Date(event.endDate)
    if (event.endTime) {
      const [endHour, endMinute] = event.endTime.split(':').map(Number)
      const eventEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), endHour, endMinute, 0, 0)
      return now > eventEnd
    } else {
      const endOfDay = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999)
      return now > endOfDay
    }
  }
  
  // For same-day events, check if end time has passed
  if (event.endTime) {
    const [endHour, endMinute] = event.endTime.split(':').map(Number)
    const eventEnd = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), endHour, endMinute, 0, 0)
    return now > eventEnd
  }
  
  // If only start time, assume event runs until end of day
  if (event.startTime) {
    const endOfDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 23, 59, 59, 999)
    return now > endOfDay
  }
  
  // If no time specified, check if date has passed
  const endOfDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 23, 59, 59, 999)
  return now > endOfDay
}

export const isEventRunning = (event: EventData): boolean => {
  const now = new Date()
  
  // Start with base dates
  const startDate = new Date(event.startDate)
  const endDate = event.endDate ? new Date(event.endDate) : new Date(event.startDate)
  
  // Add time component to start date
  if (event.startTime) {
    const [startHour, startMinute] = event.startTime.split(':').map(Number)
    startDate.setHours(startHour, startMinute, 0, 0)
  } else {
    startDate.setHours(0, 0, 0, 0)
  }
  
  // Add time component to end date
  if (event.endTime) {
    const [endHour, endMinute] = event.endTime.split(':').map(Number)
    endDate.setHours(endHour, endMinute, 0, 0)
  } else {
    endDate.setHours(23, 59, 59, 999)
  }
  
  // Check if now is between start and end
  return now >= startDate && now <= endDate
}

export type EventStatus = 'Running' | 'Past' | 'Upcoming'

export const getEventStatus = (event: EventData): EventStatus => {
  const running = isEventRunning(event)
  const past = isEventPast(event)
  
  if (running) return 'Running'
  if (past) return 'Past'
  return 'Upcoming'
}

export const getEventStatusVariant = (event: EventData): 'default' | 'secondary' | 'outline' => {
  const status = getEventStatus(event)
  if (status === 'Running') return 'default'
  if (status === 'Past') return 'secondary'
  return 'outline'
}

export const getEventStatusClassName = (event: EventData): string => {
  const status = getEventStatus(event)
  if (status === 'Running') return 'text-xs border-blue-500 text-blue-700 bg-blue-50'
  if (status === 'Past') return 'text-xs'
  return 'text-xs border-green-500 text-green-700 bg-green-50'
}
