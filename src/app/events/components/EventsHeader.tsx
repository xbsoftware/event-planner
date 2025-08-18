'use client'

import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface User {
  id: string
  role: 'REGULAR' | 'MANAGER'
  email: string
  name?: string
}

interface EventsHeaderProps {
  user: User | null
  onCreateEvent: () => void
}

export function EventsHeader({ user, onCreateEvent }: EventsHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Events</h1>
        <p className="text-gray-600">
          {user?.role === 'MANAGER' 
            ? 'Create and manage events for your organization' 
            : 'Discover and join upcoming events'
          }
        </p>
      </div>
      {user?.role === 'MANAGER' && (
        <Button onClick={onCreateEvent} className="bg-[#E91E63] hover:bg-[#C2185B] text-white">
          <Plus className="h-4 w-4 mr-2" />
          Create Event
        </Button>
      )}
    </div>
  )
}
