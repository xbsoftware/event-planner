"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatDateReadable, formatDateShort } from "@/lib/utils/dateTime";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2, User, Crown } from "lucide-react";
import AuthenticatedLayout from "@/components/AuthenticatedLayout";
import { useAuthStore } from "@/lib/stores/authStore";
import { AddUserDialog } from "./components/AddUserDialog";
import { EditUserDialog } from "./components/EditUserDialog";
import { DeleteUserDialog } from "./components/DeleteUserDialog";
import apiClient from "@/lib/apiClient";
import { toast } from "sonner";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "MANAGER" | "REGULAR";
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export default function AdminUsersPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    // Redirect if not manager
    if (user && user.role !== "MANAGER") {
      router.push("/dashboard");
      return;
    }

    if (user) {
      loadUsers();
    }
  }, [user, router]);

  const loadUsers = async () => {
    try {
      console.log("Loading users");
      const response = await apiClient.get("/api/users");
      setUsers(response.data.users);
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const formatDate = (dateString: string) => formatDateShort(dateString);

  if (!user || user.role !== "MANAGER") {
    return (
      <AuthenticatedLayout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-gray-600">
                Access denied. Manager role required.
              </p>
            </CardContent>
          </Card>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-48"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <User className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              User Management
            </h1>
          </div>
          <Button
            onClick={() => setAddDialogOpen(true)}
            className="bg-[#E91E63] hover:bg-[#C2185B] text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Users ({users.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((userData) => (
                  <TableRow key={userData.id}>
                    <TableCell className="font-medium">
                      {userData.firstName} {userData.lastName}
                    </TableCell>
                    <TableCell>{userData.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          userData.role === "MANAGER" ? "default" : "secondary"
                        }
                        className={`flex items-center space-x-1 ${
                          userData.role === "MANAGER"
                            ? "bg-[#E91E63] text-white"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {userData.role === "MANAGER" ? (
                          <Crown className="h-3 w-3" />
                        ) : (
                          <User className="h-3 w-3" />
                        )}
                        <span>{userData.role}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={userData.isActive ? "default" : "destructive"}
                      >
                        {userData.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatDate(userData.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {userData.lastLoginAt
                        ? formatDate(userData.lastLoginAt)
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUser(userData)}
                          className="border-[#E91E63] text-[#E91E63] hover:bg-[#E91E63] hover:text-white"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(userData)}
                          className="border-[#E91E63] text-[#E91E63] hover:bg-[#E91E63] hover:text-white"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {users.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No users found. Add some users to get started.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialogs */}
        <AddUserDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onUserAdded={loadUsers}
          currentUserRole={user.role}
        />

        <EditUserDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          user={selectedUser}
          onUserUpdated={loadUsers}
          currentUserRole={user.role}
        />

        <DeleteUserDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          user={selectedUser}
          onUserDeleted={loadUsers}
          currentUserRole={user.role}
        />
      </div>
    </AuthenticatedLayout>
  );
}
