/**
 * /api/admin/events — list / create camp events (admin only)
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit, getClientIp } from "@/lib/audit";
import { z } from "zod";

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const dateString = z
  .string()
  .min(1, "Date is required")
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .refine((s) => !isNaN(Date.parse(s)), "Invalid date value");

const CreateEventSchema = z
  .object({
    name: z.string().min(1, "Event name is required"),
    venue: z.string().min(1, "Venue is required"),
    hotelName: z.string().min(1, "Hotel name is required"),
    startDate: dateString,
    endDate: dateString,
    registrationDeadline: dateString,
    description: z.string().optional(),
    isActive: z.boolean().default(false),
  })
  .refine(
    (d) => new Date(d.endDate) > new Date(d.startDate),
    { message: "End date must be after start date", path: ["endDate"] }
  )
  .refine(
    (d) => new Date(d.registrationDeadline) <= new Date(d.endDate),
    {
      message: "Registration deadline must be on or before the end date",
      path: ["registrationDeadline"],
    }
  );

// ─── GET — list all camp events ───────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_req: NextRequest) {
  const result = await requireAdminSession();
  if (result instanceof NextResponse) return result;

  try {
    const events = await prisma.campEvent.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { registrations: true, rooms: true } },
        pricingRubric: { select: { id: true } },
      },
    });

    // Convert dates to ISO strings for the JSON response
    const data = events.map((e) => ({
      id: e.id,
      name: e.name,
      venue: e.venue,
      hotelName: e.hotelName,
      startDate: e.startDate.toISOString(),
      endDate: e.endDate.toISOString(),
      registrationDeadline: e.registrationDeadline.toISOString(),
      description: e.description,
      isActive: e.isActive,
      hasPricing: !!e.pricingRubric,
      registrationCount: e._count.registrations,
      roomCount: e._count.rooms,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    }));

    return NextResponse.json({ data });
  } catch (err) {
    console.error("[admin/events GET] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

// ─── POST — create a new camp event ──────────────────────────────────────────

export async function POST(req: NextRequest) {
  const result = await requireAdminSession();
  if (result instanceof NextResponse) return result;
  const session = result;
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = CreateEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, venue, hotelName, startDate, endDate, registrationDeadline, description, isActive } = parsed.data;

    // If activating this event, deactivate all others in a transaction
    const event = await prisma.$transaction(async (tx) => {
      if (isActive) {
        await tx.campEvent.updateMany({
          where: { isActive: true },
          data: { isActive: false },
        });
      }

      return tx.campEvent.create({
        data: {
          name,
          venue,
          hotelName,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          registrationDeadline: new Date(registrationDeadline),
          description: description || null,
          isActive,
        },
      });
    });

    // Audit log (best-effort)
    void logAudit({
      userId: session.user.id,
      action: "CREATE_EVENT",
      targetTable: "CampEvent",
      targetId: event.id,
      ipAddress: getClientIp(req),
    });

    return NextResponse.json({ data: event }, { status: 201 });
  } catch (err) {
    console.error("[admin/events POST] Error:", err);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}
