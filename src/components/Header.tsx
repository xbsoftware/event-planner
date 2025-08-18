'use client'

import { useAuthStore } from '@/lib/stores/authStore'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { 
  Users, 
  Calendar, 
  LayoutDashboard, 
  UserCircle, 
  Menu, 
  LogOut,
  Crown,
  User as UserIcon
} from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'

export default function Header() {
  const { user, logout } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()

  if (!user) {
    return null
  }

  const handleNavigation = (path: string) => {
    router.push(path)
  }

  const getMenuItems = () => {
    const baseItems = [
      { 
        label: 'Dashboard', 
        icon: LayoutDashboard, 
        path: user.role === 'MANAGER' ? '/admin' : '/dashboard' 
      },
      { 
        label: user.role === 'MANAGER' ? 'Manage Events' : 'Events', 
        icon: Calendar, 
        path: '/events' 
      },
      { 
        label: 'My Info', 
        icon: UserCircle, 
        path: '/my-info' 
      },
    ]

    if (user.role === 'MANAGER') {
      return [
        baseItems[0], // Dashboard
        { 
          label: 'Users', 
          icon: Users, 
          path: '/admin/users' 
        },
        baseItems[1], // Events (labeled as "Manage Events")
        baseItems[2], // My Info
      ]
    }

    return baseItems
  }

  const menuItems = getMenuItems()

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Left: XB Software Logo + Events Label + User Info */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <img
                src="/xb-software-logo.png"
                alt="XB Software Logo"
                width={120}
                height={40}
                className="h-8 w-auto"
              />
              <h1 className="text-xl font-semibold text-[#E91E63]">Events</h1>
            </div>
            
            <div className="flex items-center space-x-2">
              {user.role === 'MANAGER' ? (
                <Crown className="h-5 w-5 text-[#E91E63]" />
              ) : (
                <UserIcon className="h-5 w-5 text-gray-600" />
              )}
              <span className="text-sm font-medium text-gray-700">
                {user.firstName} {user.lastName}
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                {user.role}
              </span>
            </div>
          </div>

          {/* Right: Menu and Sign Out */}
          <div className="flex items-center space-x-3">
            
            {/* Navigation Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center space-x-2">
                  <Menu className="h-4 w-4" />
                  <span>Menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {menuItems.map((item, index) => {
                  const Icon = item.icon
                  const isActive = pathname === item.path
                  
                  return (
                    <DropdownMenuItem
                      key={index}
                      onClick={() => handleNavigation(item.path)}
                      className={`flex items-center space-x-2 cursor-pointer ${
                        isActive ? 'text-[#E91E63] font-medium' : ''
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sign Out Button */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={logout}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 border-gray-300 hover:border-gray-400"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
