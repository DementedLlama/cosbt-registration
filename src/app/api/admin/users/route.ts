/**
 * /api/admin/users — list / create admin users (SUPER_ADMIN only)
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit, getClientIp } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { z } from "zod";

const CreateUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Invalid email address").max(200),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "VIEW_ONLY"]),
});

// GET — list all users
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.isActive || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  return NextResponse.json({ data: users });
}

// POST — create a new user
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user.isActive || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreateUserSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Validation failed";
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  const { name, email, password, role } = parsed.data;

  // Check for duplicate email
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "A user with this email already exists." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { name, email, passwordHash, role },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  void logAudit({
    userId: session.user.id,
    action: "CREATE_USER",
    targetTable: "User",
    targetId: user.id,
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ data: user }, { status: 201 });
}
