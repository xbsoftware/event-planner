import { NextRequest } from 'next/server'
import { verifyToken, extractTokenFromHeader, JWTPayload } from './jwt'

/**
 * Middleware to authenticate requests using JWT
 */
export function authenticateRequest(request: NextRequest): { isAuthenticated: boolean; user?: JWTPayload; error?: string } {
  const authHeader = request.headers.get('Authorization')
  const token = extractTokenFromHeader(authHeader)

  if (!token) {
    return {
      isAuthenticated: false,
      error: 'No token provided'
    }
  }

  const user = verifyToken(token)
  if (!user) {
    return {
      isAuthenticated: false,
      error: 'Invalid or expired token'
    }
  }

  return {
    isAuthenticated: true,
    user
  }
}

/**
 * Check if user has required role
 */
export function hasRole(user: JWTPayload, requiredRole: 'REGULAR' | 'MANAGER'): boolean {
  if (requiredRole === 'REGULAR') {
    return user.role === 'REGULAR' || user.role === 'MANAGER'
  }
  return user.role === requiredRole
}

/**
 * Check if user can access resource (either owns it or is manager)
 */
export function canAccessResource(user: JWTPayload, resourceUserId: string): boolean {
  return user.userId === resourceUserId || user.role === 'MANAGER'
}
