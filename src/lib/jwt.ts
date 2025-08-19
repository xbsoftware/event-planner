import jwt from "jsonwebtoken";
import { User } from "./stores/authStore";

// JWT secret - in production, this should be a strong random string stored in environment variables
const JWT_SECRET =
  process.env.JWT_SECRET ||
  "your-super-secret-jwt-key-change-this-in-production";
const JWT_EXPIRES_IN = "7d"; // Token expires in 7 days

export interface JWTPayload {
  userId: string;
  email: string;
  role: "REGULAR" | "MANAGER";
  iat?: number;
  exp?: number;
}

/**
 * Generate JWT token for user
 */
export function generateToken(
  user: Pick<User, "id" | "email" | "role">
): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    console.log("Verifying JWT token...");
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    console.log("JWT token verified successfully for user:", decoded.email);
    return decoded;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(
  authHeader: string | null
): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7); // Remove 'Bearer ' prefix
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as JWTPayload;
    if (!decoded.exp) return true;

    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
}
