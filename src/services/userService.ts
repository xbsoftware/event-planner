import apiClient from "@/lib/apiClient";

export interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "MANAGER" | "REGULAR";
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface UpdateProfileData {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface UpdateUserData {
  firstName: string;
  lastName: string;
  email: string;
  role: "MANAGER" | "REGULAR";
  isActive: boolean;
  currentUserRole: string;
}

export interface CreateUserData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: "MANAGER" | "REGULAR";
  currentUserRole: string;
}

export class UserService {
  private static baseUrl = "/api/users";

  static async getAllUsers(): Promise<UserData[]> {
    try {
      const response = await apiClient.get(this.baseUrl);
      return response.data.users || [];
    } catch (error) {
      console.error("Error fetching users:", error);
      const { toast } = await import("sonner");
      toast.error("Failed to fetch users");
      return [];
    }
  }

  static async updateProfile(
    profileData: UpdateProfileData
  ): Promise<UserData | null> {
    try {
      const response = await apiClient.put(
        `${this.baseUrl}/profile`,
        profileData
      );
      const { toast } = await import("sonner");
      toast.success("Profile updated successfully!");
      return response.data.user;
    } catch (error: any) {
      console.error("Error updating profile:", error);
      const { toast } = await import("sonner");
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to update profile";
      toast.error(errorMessage);
      return null;
    }
  }

  static async updateUser(
    userId: string,
    userData: UpdateUserData
  ): Promise<UserData | null> {
    try {
      const response = await apiClient.put(
        `${this.baseUrl}/${userId}`,
        userData
      );
      const { toast } = await import("sonner");
      toast.success("User updated successfully!");
      return response.data.user;
    } catch (error: any) {
      console.error("Error updating user:", error);
      const { toast } = await import("sonner");
      const errorMessage =
        error.response?.data?.error || error.message || "Failed to update user";
      toast.error(errorMessage);
      return null;
    }
  }

  static async getUserById(userId: string): Promise<UserData | null> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/${userId}`);
      return response.data.user;
    } catch (error) {
      console.error("Error fetching user by ID:", error);
      const { toast } = await import("sonner");
      toast.error("Failed to fetch user");
      return null;
    }
  }

  static async deleteUser(
    userId: string,
    currentUserRole: string
  ): Promise<boolean> {
    try {
      await apiClient.delete(`${this.baseUrl}/${userId}`, {
        data: { currentUserRole },
      });
      const { toast } = await import("sonner");
      toast.success("User deleted successfully!");
      return true;
    } catch (error: any) {
      console.error("Error deleting user:", error);
      const { toast } = await import("sonner");
      const errorMessage =
        error.response?.data?.error || error.message || "Failed to delete user";
      toast.error(errorMessage);
      return false;
    }
  }

  static async createUser(userData: CreateUserData): Promise<UserData | null> {
    try {
      const response = await apiClient.post(this.baseUrl, userData);
      const { toast } = await import("sonner");
      toast.success("User created successfully!");
      return response.data.user;
    } catch (error: any) {
      console.error("Error creating user:", error);
      const { toast } = await import("sonner");
      const errorMessage =
        error.response?.data?.error || error.message || "Failed to create user";
      toast.error(errorMessage);
      return null;
    }
  }
}
