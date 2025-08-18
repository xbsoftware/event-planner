'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertTriangle, Crown, User } from 'lucide-react'
import { toast } from 'sonner'
import apiClient from '@/lib/apiClient'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'MANAGER' | 'REGULAR'
  isActive: boolean
  createdAt: string
  lastLoginAt: string | null
}

interface DeleteUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
  onUserDeleted: () => void
  currentUserRole: string
}

export function DeleteUserDialog({ open, onOpenChange, user, onUserDeleted, currentUserRole }: DeleteUserDialogProps) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!user) return

    setLoading(true)
    
    try {
      const response = await apiClient.delete(`/api/users/${user.id}`, {
        data: {
          currentUserRole
        }
      })

      toast.success('User deleted successfully')
      onUserDeleted()
      onOpenChange(false)
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to delete user'
      toast.error(errorMessage)
      console.error('Error deleting user:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span>Delete User</span>
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the user account and remove all associated data.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="space-y-2">
            <p className="font-medium text-gray-900">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-sm text-gray-600">{user.email}</p>
            <p className="text-xs text-gray-500 flex items-center space-x-2">
              <span>Role:</span>
              <span className={`flex items-center space-x-1 px-2 py-1 rounded text-xs ${user.role === 'MANAGER' ? 'bg-[#E91E63] text-white' : 'bg-gray-100 text-gray-800'}`}>
                {user.role === 'MANAGER' ? (
                  <Crown className="h-3 w-3" />
                ) : (
                  <User className="h-3 w-3" />
                )}
                <span>{user.role}</span>
              </span>
              <span>•</span>
              <span>Status: {user.isActive ? 'Active' : 'Inactive'}</span>
            </p>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">
              Are you sure you want to delete this user? This action cannot be undone.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleDelete}
            disabled={loading}
            className="bg-[#E91E63] hover:bg-[#C2185B] text-white"
          >
            {loading ? 'Deleting...' : 'Delete User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
