import axios from 'axios'

// Create axios instance with base configuration
const apiClient = axios.create({
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add JWT token
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage (Zustand persist storage)
    if (typeof window !== 'undefined') {
      const authStorage = localStorage.getItem('auth-storage')
      if (authStorage) {
        try {
          const parsed = JSON.parse(authStorage)
          const token = parsed.state?.token
          if (token) {
            config.headers.Authorization = `Bearer ${token}`
          }
        } catch (error) {
          console.warn('Failed to parse auth storage:', error)
        }
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for global error handling
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // Handle common errors globally
    if (error.response?.status === 401) {
      // Token expired or invalid - could redirect to login
      console.warn('Authentication failed - token may be expired')
      
      // Clear auth storage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth-storage')
        // Optionally redirect to login
        // window.location.href = '/'
      }
    }
    
    return Promise.reject(error)
  }
)

export default apiClient
