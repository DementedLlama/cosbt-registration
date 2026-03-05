/**
 * GET /api/admin/registrations — list registrations with search, filter, sort
 *
 * Query params:
 *   ?search=       — filters by invoice number or Room I/C name (case-insensitive)
 *   ?status=       — filter by PaymentStatus (UNPAID | PAID | PARTIAL)
 *   ?eventId=      — filter by camp event
 *   ?sort=         — field to sort by (createdAt | totalAmount | invoiceNumber) default: createdAt
 *   ?order=        — asc | desc (default: desc)
 *   ?page=         — page number (default: 1)
 *   ?limit=        — items per page (default: 25, max: 100)
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export async function GET(req: NextRequest) {
  const result = await requireAdminSession();
  if (result instanceof NextResponse) return result;

  try {
    const sp = req.nextUrl.searchParams;
    const search = sp.get("search")?.trim() || "";
    const status = sp.get("status") || "";
    const eventId = sp.get("eventId") || "";
    const sortField = sp.get("sort") || "createdAt";
    const sortOrder = sp.get("order") === "asc" ? "asc" : "desc";
    const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(sp.get("limit") || "25", 10)));
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.RoomWhereInput = {};

    if (status && ["UNPAID", "PAID", "PARTIAL"].includes(status)) {
      where.paymentStatus = status as "UNPAID" | "PAID" | "PARTIAL";
    }

    if (eventId) {
      where.campEventId = eventId;
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        {
          registration: {
            roomInChargeName: { contains: search, mode: "insensitive" },
          },
        },
        {
          registration: {
            roomInChargeEmail: { contains: search, mode: "insensitive" },
          },
        },
      ];
    }

    // Build orderBy
    const orderByMap: Record<string, Prisma.RoomOrderByWithRelationInput> = {
      createdAt: { createdAt: sortOrder },
      totalAmount: { totalAmount: sortOrder },
      invoiceNumber: { invoiceNumber: sortOrder },
    };
    const orderBy = orderByMap[sortField] || { createdAt: "desc" };

    // Parallel: count + fetch
    const [total, rooms] = await Promise.all([
      prisma.room.count({ where }),
      prisma.room.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          registration: {
            select: {
              id: true,
              roomInChargeName: true,
              roomInChargeEmail: true,
              roomInChargeMobile: true,
              roomInChargeChurch: true,
              createdAt: true,
            },
          },
          campEvent: {
            select: { id: true, name: true },
          },
          _count: { select: { occupants: true } },
        },
      }),
    ]);

    const data = rooms.map((r) => ({
      id: r.id,
      registrationId: r.registrationId,
      invoiceNumber: r.invoiceNumber,
      packageType: r.packageType,
      paymentStatus: r.paymentStatus,
      totalAmount: Number(r.totalAmount),
      pax: r._count.occupants,
      roomInChargeName: r.registration.roomInChargeName,
      roomInChargeEmail: r.registration.roomInChargeEmail,
      eventName: r.campEvent.name,
      createdAt: r.createdAt.toISOString(),
    }));

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("[admin/registrations GET] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch registrations" },
      { status: 500 }
    );
  }
}
