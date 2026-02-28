/**
 * /api/admin/pricing — get / upsert pricing rubric (admin only)
 * Full implementation in next phase.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  void req;
  return NextResponse.json({ data: null, message: "Not implemented yet." });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "VIEW_ONLY") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  void req;
  return NextResponse.json({ error: "Not implemented yet." }, { status: 501 });
}
