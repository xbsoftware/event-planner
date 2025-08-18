import { create } from 'zustand'
import apiClient from '@/lib/apiClient'

interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  role: 'REGULAR' | 'MANAGER'
  isActive: boolean
  createdAt: string
  lastLoginAt?: string
}

interface UsersState {
  users: User[]
  loading: boolean
  error: string | null
  fetchUsers: () => Promise<void>
  clearError: () => void
}

export const useUsersStore = create<UsersState>((set) => ({
  users: [],
  loading: false,
  error: null,

  fetchUsers: async () => {
    set({ loading: true, error: null })

    try {
      const response = await apiClient.get('/api/users')
      set({ users: response.data.users || [], loading: false })
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch users'
      set({ error: errorMessage, loading: false })
    }
  },

  clearError: () => {
    set({ error: null })
  },
}))
