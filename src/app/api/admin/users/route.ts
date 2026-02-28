/**
 * /api/admin/users — list / create admin users (SUPER_ADMIN only)
 * Full implementation in next phase.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession, Session } from "next-auth";
import { authOptions } from "@/lib/auth";

function requireSuperAdmin(session: Session | null) {
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const err = requireSuperAdmin(session);
  if (err) return err;
  void req;
  return NextResponse.json({ data: [], message: "Not implemented yet." });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const err = requireSuperAdmin(session);
  if (err) return err;
  void req;
  return NextResponse.json({ error: "Not implemented yet." }, { status: 501 });
}
