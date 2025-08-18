'use client'

import AuthenticatedLayout from '@/components/AuthenticatedLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuthStore } from '@/lib/stores/authStore'
import { 
  User, 
  Mail, 
  Crown,
  Calendar,
  Settings,
  Save,
  Edit,
  Users,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { UserService, UserData } from '@/services'

export default function MyInfoPage() {
  const { user, setUser } = useAuthStore()
  const [isEditing, setIsEditing] = useState(false)
  const [isEditingUser, setIsEditingUser] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: ''
  })
  const [userFormData, setUserFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'REGULAR' as 'MANAGER' | 'REGULAR',
    isActive: true
  })

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email
      })
    }
  }, [user])

  useEffect(() => {
    if (user?.role === 'MANAGER') {
      fetchUsers()
    }
  }, [user])

  const fetchUsers = async () => {
    const usersData = await UserService.getAllUsers()
    setUsers(usersData)
  }

  const handleSaveProfile = async () => {
    if (!user) return
    
    setLoading(true)
    const updatedUser = await UserService.updateProfile({
      userId: user.id,
      ...formData
    })
    
    if (updatedUser) {
      setUser(updatedUser)
      setIsEditing(false)
      
      // Update the users list if current user is a manager and they updated their own profile
      if (user.role === 'MANAGER') {
        setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u))
      }
    }
    
    setLoading(false)
  }

  const handleSaveUser = async () => {
    if (!selectedUser || !user) return
    
    setLoading(true)
    const updatedUser = await UserService.updateUser(selectedUser.id, {
      ...userFormData,
      currentUserRole: user.role
    })
    
    if (updatedUser) {
      setUsers(users.map(u => u.id === selectedUser.id ? updatedUser : u))
      setIsEditingUser(false)
      setSelectedUser(null)
    }
    
    setLoading(false)
  }

  const handleEditUser = (userData: UserData) => {
    setSelectedUser(userData)
    setUserFormData({
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      email: userData.email,
      role: userData.role,
      isActive: userData.isActive
    })
    setIsEditingUser(true)
  }

  const handleCancel = () => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email
      })
    }
    setIsEditing(false)
  }

  const handleCancelUser = () => {
    setIsEditingUser(false)
    setSelectedUser(null)
  }

  if (!user) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading user information...</p>
        </div>
      </AuthenticatedLayout>
    )
  }

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Information</h1>
            <p className="text-gray-600 mt-1">Manage your personal profile and account settings</p>
          </div>
          {!isEditing && (
            <Button 
              onClick={() => setIsEditing(true)}
              className="bg-[#E91E63] hover:bg-[#D81B60]"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Information */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {isEditing ? (
                  // Edit Form
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          placeholder="Enter your first name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          placeholder="Enter your last name"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="Enter your email"
                      />
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <Button 
                        onClick={handleSaveProfile} 
                        disabled={loading}
                        className="bg-[#E91E63] hover:bg-[#D81B60]"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {loading ? 'Saving...' : 'Save Changes'}
                      </Button>
                      <Button variant="outline" onClick={handleCancel}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label className="text-sm font-medium text-gray-500">First Name</Label>
                        <p className="text-lg font-medium mt-1">{user.firstName || 'Not set'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Last Name</Label>
                        <p className="text-lg font-medium mt-1">{user.lastName || 'Not set'}</p>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Email Address</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <p className="text-lg font-medium">{user.email}</p>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-500">Account Type</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        {user.role === 'MANAGER' ? (
                          <Crown className="h-5 w-5 text-[#E91E63]" />
                        ) : (
                          <User className="h-5 w-5 text-gray-600" />
                        )}
                        <Badge 
                          variant={user.role === 'MANAGER' ? 'default' : 'secondary'}
                          className={user.role === 'MANAGER' ? 'bg-[#E91E63] text-white' : 'bg-gray-100 text-gray-800'}
                        >
                          {user.role}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Account Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  Account Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  {user.role === 'MANAGER' ? (
                    <Crown className="h-12 w-12 text-[#E91E63] mx-auto mb-2" />
                  ) : (
                    <User className="h-12 w-12 text-gray-600 mx-auto mb-2" />
                  )}
                  <h3 className="font-medium text-lg">{user.firstName} {user.lastName}</h3>
                  <p className="text-sm text-gray-600">{user.email}</p>
                  <Badge 
                    className={`mt-2 ${user.role === 'MANAGER' ? 'bg-[#E91E63] text-white' : 'bg-gray-100 text-gray-800'}`}
                  >
                    {user.role}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Account ID:</span>
                    <span className="font-medium">{user.id}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Member Since:</span>
                    <span className="font-medium">Jan 2025</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Last Login:</span>
                    <span className="font-medium">Today</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="w-4 h-4 mr-2" />
                  View My Events
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="w-4 h-4 mr-2" />
                  Change Password
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Mail className="w-4 h-4 mr-2" />
                  Email Preferences
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Manager Section - Edit Other Users */}
        {user?.role === 'MANAGER' && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  User Management
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Edit user information and manage roles (Manager privileges)
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((userData) => (
                    <div
                      key={userData.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          {userData.role === 'MANAGER' ? (
                            <Crown className="h-5 w-5 text-[#E91E63]" />
                          ) : (
                            <User className="h-5 w-5 text-gray-600" />
                          )}
                          <div>
                            <p className="font-medium">
                              {userData.firstName} {userData.lastName}
                            </p>
                            <p className="text-sm text-gray-600">{userData.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={userData.role === 'MANAGER' ? 'default' : 'secondary'}
                            className={userData.role === 'MANAGER' ? 'bg-[#E91E63] text-white' : 'bg-gray-100 text-gray-800'}
                          >
                            {userData.role}
                          </Badge>
                          {userData.isActive ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditUser(userData)}
                        disabled={userData.id === user?.id}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        {userData.id === user?.id ? 'Current User' : 'Edit'}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Edit User Modal/Form */}
        {isEditingUser && selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Edit User Information</CardTitle>
                <p className="text-sm text-gray-600">
                  Editing: {selectedUser.firstName} {selectedUser.lastName}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="userFirstName">First Name</Label>
                    <Input
                      id="userFirstName"
                      value={userFormData.firstName}
                      onChange={(e) => setUserFormData({ ...userFormData, firstName: e.target.value })}
                      placeholder="Enter first name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="userLastName">Last Name</Label>
                    <Input
                      id="userLastName"
                      value={userFormData.lastName}
                      onChange={(e) => setUserFormData({ ...userFormData, lastName: e.target.value })}
                      placeholder="Enter last name"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="userEmail">Email Address</Label>
                  <Input
                    id="userEmail"
                    type="email"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    placeholder="Enter email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="userRole">Role</Label>
                  <Select
                    value={userFormData.role}
                    onValueChange={(value: 'MANAGER' | 'REGULAR') => 
                      setUserFormData({ ...userFormData, role: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="REGULAR">Regular User</SelectItem>
                      <SelectItem value="MANAGER">Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="userActive"
                    checked={userFormData.isActive}
                    onChange={(e) => setUserFormData({ ...userFormData, isActive: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="userActive">Active User</Label>
                </div>

                <div className="flex space-x-3 pt-4">
                  <Button
                    onClick={handleSaveUser}
                    disabled={loading}
                    className="bg-[#E91E63] hover:bg-[#D81B60]"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button variant="outline" onClick={handleCancelUser}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  )
}
