'use client'

import { useAuthStore } from '@/lib/stores/authStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AuthDebugPage() {
  const { user, token, validateAndRefreshSession, logout } = useAuthStore()

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Authentication Debug</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Current Auth State</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <strong>User:</strong>
            <pre className="bg-gray-100 p-2 rounded mt-1 text-sm overflow-x-auto">
              {user ? JSON.stringify(user, null, 2) : 'Not logged in'}
            </pre>
          </div>
          
          <div>
            <strong>Token:</strong>
            <pre className="bg-gray-100 p-2 rounded mt-1 text-sm overflow-x-auto">
              {token ? `${token.substring(0, 50)}...` : 'No token'}
            </pre>
          </div>
          
          <div className="flex space-x-2">
            <Button onClick={validateAndRefreshSession}>
              Validate Session
            </Button>
            {user && (
              <Button variant="destructive" onClick={logout}>
                Logout
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test API Calls</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Try making authenticated API calls to test JWT authentication.
          </p>
          <Button 
            onClick={async () => {
              try {
                // Import our configured axios client
                const { default: apiClient } = await import('@/lib/apiClient')
                const response = await apiClient.get('/api/events')
                console.log('Events API response:', response.data)
                alert(`API call successful! Check console for details.`)
              } catch (error: any) {
                console.error('API call failed:', error)
                const errorMessage = error.response?.data?.error || error.message || 'API call failed'
                alert(`API call failed: ${errorMessage}. Check console for details.`)
              }
            }}
            disabled={!token}
          >
            Test Events API
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
