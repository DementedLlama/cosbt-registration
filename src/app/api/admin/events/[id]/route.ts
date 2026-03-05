/**
 * /api/admin/events/[id] — get / update a single camp event (admin only)
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit, getClientIp } from "@/lib/audit";
import { z } from "zod";

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const dateString = z
    .string()
    .min(1, "Date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .refine((s) => !isNaN(Date.parse(s)), "Invalid date value");

const UpdateEventSchema = z
    .object({
        name: z.string().min(1, "Event name is required"),
        venue: z.string().min(1, "Venue is required"),
        hotelName: z.string().min(1, "Hotel name is required"),
        startDate: dateString,
        endDate: dateString,
        registrationDeadline: dateString,
        description: z.string().optional(),
        isActive: z.boolean(),
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

type RouteContext = { params: { id: string } };

// ─── GET — fetch a single event by id ─────────────────────────────────────────

export async function GET(
    _req: NextRequest,
    { params }: RouteContext
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isActive) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const event = await prisma.campEvent.findUnique({
            where: { id: params.id },
            include: {
                pricingRubric: true,
                _count: { select: { registrations: true, rooms: true } },
            },
        });

        if (!event) {
            return NextResponse.json({ error: "Event not found" }, { status: 404 });
        }

        const safeISO = (d: Date) => { try { return d.toISOString(); } catch { return ""; } };

        return NextResponse.json({
            data: {
                id: event.id,
                name: event.name,
                venue: event.venue,
                hotelName: event.hotelName,
                startDate: safeISO(event.startDate),
                endDate: safeISO(event.endDate),
                registrationDeadline: safeISO(event.registrationDeadline),
                description: event.description,
                isActive: event.isActive,
                hasPricing: !!event.pricingRubric,
                registrationCount: event._count.registrations,
                roomCount: event._count.rooms,
                createdAt: safeISO(event.createdAt),
                updatedAt: safeISO(event.updatedAt),
            },
        });
    } catch (err) {
        console.error("[admin/events/[id] GET] Error:", err);
        return NextResponse.json(
            { error: "Failed to fetch event" },
            { status: 500 }
        );
    }
}

// ─── PUT — update an existing event ───────────────────────────────────────────

export async function PUT(
    req: NextRequest,
    { params }: RouteContext
) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isActive) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role === "VIEW_ONLY") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        // Verify the event exists
        const existing = await prisma.campEvent.findUnique({
            where: { id: params.id },
        });
        if (!existing) {
            return NextResponse.json({ error: "Event not found" }, { status: 404 });
        }

        const body = await req.json();
        const parsed = UpdateEventSchema.safeParse(body);
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
                    where: { isActive: true, id: { not: params.id } },
                    data: { isActive: false },
                });
            }

            return tx.campEvent.update({
                where: { id: params.id },
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
            action: "UPDATE_EVENT",
            targetTable: "CampEvent",
            targetId: event.id,
            ipAddress: getClientIp(req),
        });

        return NextResponse.json({ data: event });
    } catch (err) {
        console.error("[admin/events/[id] PUT] Error:", err);
        return NextResponse.json(
            { error: "Failed to update event" },
            { status: 500 }
        );
    }
}
