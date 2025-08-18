# Services Layer

This directory contains all API service modules that handle communication with the backend APIs. The services are organized by domain and provide a clean, typed interface for making API requests.

## Structure

```
src/services/
├── index.ts          # Main export file
├── apiService.ts     # Common API utilities and error handling
├── authService.ts    # Authentication-related API calls
├── userService.ts    # User management API calls
└── eventService.ts   # Event management API calls (future)
```

## Usage

### Import Services

```typescript
// Import specific services
import { UserService, AuthService, EventService } from '@/services'

// Import types
import type { UserData, LoginCredentials, EventData } from '@/services'

// Import error handling
import { ApiService, ApiError } from '@/services'
```

### Authentication Service

```typescript
// Login
try {
  const response = await AuthService.login({ email, password })
  console.log('User:', response.user)
} catch (error) {
  console.error('Login failed:', ApiService.getErrorMessage(error))
}

// Logout
await AuthService.logout()

// Validate session
const isValid = await AuthService.validateSession()
```

### User Service

```typescript
// Get all users (Manager only)
const users = await UserService.getAllUsers()

// Update current user profile
const updatedUser = await UserService.updateProfile({
  userId: 'user-id',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com'
})

// Update any user (Manager only)
const updatedUser = await UserService.updateUser('user-id', {
  firstName: 'Jane',
  lastName: 'Smith',
  email: 'jane@example.com',
  role: 'MANAGER',
  isActive: true,
  currentUserRole: 'MANAGER'
})
```

### Event Service (Future)

```typescript
// Get all events
const events = await EventService.getAllEvents()

// Create event
const newEvent = await EventService.createEvent({
  title: 'Team Meeting',
  description: 'Weekly team sync',
  date: '2025-08-15T10:00:00Z',
  location: 'Conference Room A'
})

// Update event
const updatedEvent = await EventService.updateEvent('event-id', {
  title: 'Updated Meeting Title'
})

// Join/Leave event
const eventWithAttendance = await EventService.toggleEventAttendance('event-id', true)
```

### Error Handling

All services use the `ApiService` for consistent error handling:

```typescript
try {
  const result = await UserService.getAllUsers()
} catch (error) {
  // Get user-friendly error message
  const message = ApiService.getErrorMessage(error)
  
  // Handle specific error types
  if (error instanceof ApiError) {
    console.log('API Error:', error.status, error.message)
  }
}
```

## Error Types

- `ApiError`: Custom error class with status codes and messages
- Network errors are automatically caught and wrapped
- All services provide consistent error messaging

## Benefits

1. **Centralized API Logic**: All API calls are in one place
2. **Type Safety**: Full TypeScript support with interfaces
3. **Consistent Error Handling**: Standardized error management
4. **Reusability**: Services can be used across components
5. **Testing**: Easier to mock and test API interactions
6. **Maintainability**: Clear separation of concerns

## Best Practices

1. Always handle errors when calling services
2. Use the provided types for better type safety
3. Import services from the main index file
4. Use `ApiService.getErrorMessage()` for user-friendly error messages
5. Don't directly use fetch in components - use services instead
