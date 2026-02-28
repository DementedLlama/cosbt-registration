/**
 * GET /api/admin/registrations — list all registrations (all authenticated roles)
 *
 * Full implementation (filtering, pagination, search) to follow in next phase.
 * All authenticated roles (VIEW_ONLY, ADMIN, SUPER_ADMIN) may list registrations.
 * Passport number decryption is handled per-record in the detail endpoint (/[id]).
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  void req; // TODO: read query params for filtering and pagination
  return NextResponse.json({ data: [], message: "Not implemented yet." });
}
