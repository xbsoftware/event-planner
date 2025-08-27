import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AuthService, ApiService } from "@/services";

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: "REGULAR" | "MANAGER";
  createdAt?: string;
  lastLoginAt?: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  validateAndRefreshSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const loginResponse = await AuthService.login({ email, password });
          set({
            user: loginResponse.user,
            token: loginResponse.token,
            isLoading: false,
          });
        } catch (error) {
          const errorMessage = ApiService.getErrorMessage(error);
          set({ error: errorMessage, isLoading: false });
        }
      },

      logout: () => {
        set({ user: null, token: null, error: null });
        window.location.href = "/";
      },

      clearError: () => {
        set({ error: null });
      },

      setUser: (user: User) => {
        set({ user });
      },

      setToken: (token: string) => {
        set({ token });
      },

      validateAndRefreshSession: async () => {
        const { token } = get();
        console.log("Validating session, token exists:", !!token);

        if (!token) {
          console.log("No token found, clearing session");
          set({ user: null, token: null });
          return;
        }

        try {
          // First, try to decode the token client-side to check if it's expired
          const payload = JSON.parse(atob(token.split(".")[1]));
          const isExpired = payload.exp && payload.exp * 1000 < Date.now();

          if (isExpired) {
            console.log("Token expired, clearing session");
            set({ user: null, token: null });
            return;
          }

          // If token is not expired, try to validate with server
          console.log("Calling validateSession API...");
          const response = await AuthService.validateSession(token);
          console.log("Session validation response:", !!response);

          if (response) {
            console.log("Session valid, updating user state");
            set({ user: response.user, token: response.token });
          } else {
            console.log(
              "Session validation failed, but token seems valid. Using cached user."
            );
            // If server validation fails but token is valid, keep the user logged in
            // This handles cases where the validation endpoint has cold start issues
            if (payload.userId && payload.email && payload.role) {
              const user = {
                id: payload.userId,
                email: payload.email,
                firstName: null,
                lastName: null,
                role: payload.role,
              };
              set({ user, token });
            } else {
              set({ user: null, token: null });
            }
          }
        } catch (error) {
          console.error("Session validation error:", error);
          // On error, try to decode token and use cached info if valid
          try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            const isExpired = payload.exp && payload.exp * 1000 < Date.now();

            if (!isExpired && payload.userId && payload.email && payload.role) {
              console.log("Using cached token data due to server error");
              const user = {
                id: payload.userId,
                email: payload.email,
                firstName: null,
                lastName: null,
                role: payload.role,
              };
              set({ user, token });
            } else {
              set({ user: null, token: null });
            }
          } catch (tokenError) {
            console.error("Failed to decode token:", tokenError);
            set({ user: null, token: null });
          }
        }
      },
    }),
    {
      name: "auth-storage", // unique name for localStorage key
      partialize: (state) => ({ user: state.user, token: state.token }), // persist user and token
    }
  )
);
