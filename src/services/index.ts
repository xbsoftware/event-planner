// Export all services from a single entry point
export { UserService } from './userService'
export { AuthService } from './authService'
export { EventService } from './eventService'
export { ApiService, ApiError } from './apiService'

// Re-export types for convenience
export type { UserData, UpdateProfileData, UpdateUserData, CreateUserData } from './userService'
export type { LoginCredentials, LoginResponse } from './authService'
export type { EventData, CreateEventData, UpdateEventData, EventCustomFieldData } from './eventService'
