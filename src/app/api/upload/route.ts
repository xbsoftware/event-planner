import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Content-type and size guards
    const allowed = new Set([
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
      "image/svg+xml",
    ]);
    const contentType = (file as any).type || "";
    if (!allowed.has(contentType)) {
      return NextResponse.json(
        { error: "Unsupported file type" },
        { status: 400 }
      );
    }

    const maxBytes = 2 * 1024 * 1024; // 2MB
    const fileSize = (file as any).size ?? 0;
    if (fileSize > maxBytes) {
      return NextResponse.json(
        { error: "File too large (max 2MB)" },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Ensure target dir exists
    const uploadDir = path.join(process.cwd(), "public", "upload");
    await fs.mkdir(uploadDir, { recursive: true });

    // Build a randomized filename based on content type (avoid user-provided names)
    const uuid = crypto.randomUUID();
    const ext =
      contentType === "image/png"
        ? ".png"
        : contentType === "image/jpeg"
        ? ".jpg"
        : contentType === "image/webp"
        ? ".webp"
        : contentType === "image/gif"
        ? ".gif"
        : contentType === "image/svg+xml"
        ? ".svg"
        : "";
    const finalName = `${uuid}${ext}`;
    const filePath = path.join(uploadDir, finalName);

    await fs.writeFile(filePath, buffer);

    const publicUrl = `/upload/${finalName}`;
    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error("Upload failed:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const uploadDir = path.join(process.cwd(), "public", "upload");
    await fs.mkdir(uploadDir, { recursive: true });
    const entries = await fs.readdir(uploadDir, { withFileTypes: true });
    const files = await Promise.all(
      entries
        .filter((e) => e.isFile())
        .map(async (e) => {
          const filePath = path.join(uploadDir, e.name);
          const stat = await fs.stat(filePath);
          return {
            name: e.name,
            url: `/upload/${e.name}`,
            mtimeMs: stat.mtimeMs,
          };
        })
    );
    // Sort newest first
    files.sort((a, b) => b.mtimeMs - a.mtimeMs);
    return NextResponse.json({
      uploads: files.map(({ name, url }) => ({ name, url })),
    });
  } catch (err) {
    console.error("List uploads failed:", err);
    return NextResponse.json(
      { error: "Failed to list uploads" },
      { status: 500 }
    );
  }
}
