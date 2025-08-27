import axios from "axios";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: "MANAGER" | "REGULAR";
    createdAt?: string;
    lastLoginAt?: string | null;
  };
  token: string;
}

export class AuthService {
  private static baseUrl = "/api/auth";

  /**
   * Authenticate user with email and password
   */
  static async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await axios.post(`${this.baseUrl}/login`, credentials);
      return response.data;
    } catch (error: any) {
      console.error("Error during login:", error);
      const errorMessage =
        error.response?.data?.error || error.message || "Login failed";
      throw new Error(errorMessage);
    }
  }

  /**
   * Logout user (if needed for API cleanup)
   */
  static async logout(): Promise<void> {
    try {
      // This could be used if we need to clear server-side sessions
      // For now, it's mainly for potential future use
      await axios.post(`${this.baseUrl}/logout`);
    } catch (error) {
      console.warn("Error during logout API call:", error);
      // Don't throw error for logout, just log it
    }
  }

  /**
   * Validate current session using JWT token
   */
  static async validateSession(token: string): Promise<LoginResponse | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/validate`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return { user: response.data.user, token };
    } catch (error) {
      console.error("Error validating session:", error);
      return null;
    }
  }

  /**
   * Get authorization header for API requests
   */
  static getAuthHeader(token: string): Record<string, string> {
    return {
      Authorization: `Bearer ${token}`,
    };
  }
}
