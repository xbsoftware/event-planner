'use client'

import { Button } from '@/components/ui/button'
import { Eye, Edit, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { EventData } from '@/services/eventService'

interface ManagerActionsProps {
  event: EventData
  onEdit: (event: EventData) => void
  onDelete: (event: EventData) => void
}

export function ManagerActions({ event, onEdit, onDelete }: ManagerActionsProps) {
  const router = useRouter()
  
  return (
    <div className="flex space-x-2">
      <Button 
        variant="outline"
        size="sm" 
        onClick={() => router.push(`/events/${event.id}`)}
        style={{
          borderColor: '#E91E63',
          color: '#E91E63',
          backgroundColor: 'transparent'
        }}
        className="hover:!bg-[#E91E63] hover:!text-white"
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#E91E63'
          e.currentTarget.style.color = 'white'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
          e.currentTarget.style.color = '#E91E63'
        }}
      >
        <Eye className="h-4 w-4 mr-1" />
        View
      </Button>
      <Button 
        variant="outline"
        size="sm" 
        onClick={() => onEdit(event)}
        style={{
          borderColor: '#E91E63',
          color: '#E91E63',
          backgroundColor: 'transparent'
        }}
        className="hover:!bg-[#E91E63] hover:!text-white"
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#E91E63'
          e.currentTarget.style.color = 'white'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
          e.currentTarget.style.color = '#E91E63'
        }}
      >
        <Edit className="h-4 w-4 mr-1" />
        Edit
      </Button>
      <Button 
        size="sm" 
        onClick={() => onDelete(event)}
        className="bg-[#E91E63] hover:bg-[#C2185B] text-white"
      >
        <Trash2 className="h-4 w-4 mr-1" />
        Delete
      </Button>
    </div>
  )
}
