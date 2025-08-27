import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { UserRole } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Check if user exists, if not create them
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          role: UserRole.REGULAR,
          isActive: true,
        },
      });
    }

    // Create verification code
    // Delete any existing codes for this email
    await prisma.verificationCode.deleteMany({ where: { email } });
    await prisma.verificationCode.create({
      data: {
        email,
        code,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    // In a real app, you would send this code via email
    // For demo purposes, we'll log it to console
    console.log(`Verification code for ${email}: ${code}`);

    return NextResponse.json({
      message: "Verification code sent successfully",
      // In production, don't return the code!
      code: process.env.NODE_ENV === "development" ? code : undefined,
    });
  } catch (error) {
    console.error("Error sending verification code:", error);
    return NextResponse.json(
      { error: "Failed to send verification code" },
      { status: 500 }
    );
  }
}
