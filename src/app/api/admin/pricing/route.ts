/**
 * /api/admin/pricing — get / upsert pricing rubric (admin only)
 *
 * GET  ?eventId=xxx  → returns PricingRubric for the given event (or null)
 * POST              → create or update PricingRubric for a given event
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit, getClientIp } from "@/lib/audit";
import { z } from "zod";

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const rate = z
  .string()
  .min(1, "Rate is required")
  .regex(/^\d+(\.\d{1,2})?$/, "Must be a valid amount (e.g. 350.00)");

const PricingSchema = z.object({
  campEventId: z.string().min(1, "Camp event ID is required"),
  singleAdultRate: rate,
  twinAdultRate: rate,
  tripleAdultRate: rate,
  singleStudentRate: rate,
  twinStudentRate: rate,
  tripleStudentRate: rate,
  childPrimaryRate: rate,
  extraBedRate: rate,
  preschoolRate: rate,
});

// ─── GET — fetch pricing for a camp event ─────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const eventId = req.nextUrl.searchParams.get("eventId");
  if (!eventId) {
    return NextResponse.json(
      { error: "eventId query parameter is required" },
      { status: 400 }
    );
  }

  try {
    const pricing = await prisma.pricingRubric.findUnique({
      where: { campEventId: eventId },
    });

    return NextResponse.json({ data: pricing });
  } catch (err) {
    console.error("[admin/pricing GET] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch pricing" },
      { status: 500 }
    );
  }
}

// ─── POST — create or update pricing for a camp event ─────────────────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role === "VIEW_ONLY") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = PricingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { campEventId, ...rates } = parsed.data;

    // Verify the event exists
    const event = await prisma.campEvent.findUnique({
      where: { id: campEventId },
    });
    if (!event) {
      return NextResponse.json(
        { error: "Camp event not found" },
        { status: 404 }
      );
    }

    // Check if pricing already exists to determine audit action
    const existing = await prisma.pricingRubric.findUnique({
      where: { campEventId },
      select: { id: true },
    });

    // Upsert: create if none exists, update otherwise
    const pricing = await prisma.pricingRubric.upsert({
      where: { campEventId },
      create: { campEventId, ...rates },
      update: { ...rates },
    });

    // Audit log (best-effort)
    void logAudit({
      userId: session.user.id,
      action: existing ? "UPDATE_PRICING" : "CREATE_PRICING",
      targetTable: "PricingRubric",
      targetId: pricing.id,
      ipAddress: getClientIp(req),
    });

    return NextResponse.json({ data: pricing }, { status: 200 });
  } catch (err) {
    console.error("[admin/pricing POST] Error:", err);
    return NextResponse.json(
      { error: "Failed to save pricing" },
      { status: 500 }
    );
  }
}
