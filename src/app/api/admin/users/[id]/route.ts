/**
 * /api/admin/users/[id] — update / deactivate a user (SUPER_ADMIN only)
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit, getClientIp } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { z } from "zod";

const UpdateUserSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "VIEW_ONLY"]).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).max(200).optional(),
});

// PUT — update user (role, name, status, reset password)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const result = await requireAdminSession();
  if (result instanceof NextResponse) return result;
  const session = result;
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = UpdateUserSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Validation failed";
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  const { name, role, isActive, password } = parsed.data;

  // Prevent super admin from deactivating themselves
  if (params.id === session.user.id && isActive === false) {
    return NextResponse.json(
      { error: "You cannot deactivate your own account." },
      { status: 400 }
    );
  }

  // Prevent super admin from downgrading themselves
  if (params.id === session.user.id && role && role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "You cannot change your own role." },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Build update data
  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (role !== undefined) updateData.role = role;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (password) updateData.passwordHash = await bcrypt.hash(password, 12);

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data: updateData,
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

  const action = isActive === false ? "DELETE_USER" : "UPDATE_USER";
  void logAudit({
    userId: session.user.id,
    action,
    targetTable: "User",
    targetId: user.id,
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ data: user });
}
