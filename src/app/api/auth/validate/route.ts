import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    console.log("Validating session...");
    const authHeader = request.headers.get("Authorization");
    console.log("Auth header:", authHeader ? "Present" : "Missing");

    const auth = authenticateRequest(request);
    console.log("Auth result:", {
      isAuthenticated: auth.isAuthenticated,
      error: auth.error,
    });

    if (!auth.isAuthenticated || !auth.user) {
      console.log("Authentication failed:", auth.error);
      return NextResponse.json(
        { error: auth.error || "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("Token valid, fetching user:", auth.user.userId);
    // Optionally, fetch fresh user data from database
    const user = await prisma.user.findUnique({
      where: { id: auth.user.userId },
    });
    if (!user) {
      console.log("User not found in database:", auth.user.userId);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Return current user data (include timestamps for client display)
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
      },
      valid: true,
    });
  } catch (error) {
    console.error("Token validation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
