/**
 * /api/admin/registrations/[id] — room detail + payment status update
 *
 * GET  — full room detail with occupants (passport numbers decrypted for ADMIN+)
 * PUT  — update payment status and/or admin notes
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt, isEncrypted } from "@/lib/encryption";
import { logAudit, getClientIp } from "@/lib/audit";
import { z } from "zod";

// ─── GET — room detail with occupants ─────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const result = await requireAdminSession();
  if (result instanceof NextResponse) return result;
  const session = result;

  try {
    const room = await prisma.room.findUnique({
      where: { id: params.id },
      include: {
        registration: true,
        campEvent: { select: { id: true, name: true, hotelName: true } },
        occupants: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!room) {
      return NextResponse.json(
        { error: "Registration not found" },
        { status: 404 }
      );
    }

    const canDecrypt =
      session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";

    // Decrypt passport numbers for authorised roles
    const occupants = room.occupants.map((occ) => {
      let passportDisplay: string;
      if (canDecrypt && isEncrypted(occ.passportNumber)) {
        try {
          passportDisplay = decrypt(occ.passportNumber);
        } catch {
          passportDisplay = "[decryption error]";
        }
      } else if (canDecrypt) {
        passportDisplay = occ.passportNumber; // already plaintext (legacy)
      } else {
        passportDisplay = "••••••••";
      }

      return {
        id: occ.id,
        fullName: occ.fullName,
        dateOfBirth: occ.dateOfBirth.toISOString().split("T")[0],
        nationality: occ.nationality,
        passportNumber: passportDisplay,
        passportExpiry: occ.passportExpiry.toISOString().split("T")[0],
        occupantType: occ.occupantType,
        isStudent: occ.isStudent,
        bedType: occ.bedType,
        transportMode: occ.transportMode,
      };
    });

    // Audit: log passport view for authorised roles
    if (canDecrypt) {
      void logAudit({
        userId: session.user.id,
        action: "VIEW_PASSPORT",
        targetTable: "Room",
        targetId: room.id,
        ipAddress: getClientIp(req),
      });
    }

    return NextResponse.json({
      data: {
        id: room.id,
        invoiceNumber: room.invoiceNumber,
        packageType: room.packageType,
        paymentStatus: room.paymentStatus,
        totalAmount: Number(room.totalAmount),
        adminNotes: room.adminNotes,
        createdAt: room.createdAt.toISOString(),
        updatedAt: room.updatedAt.toISOString(),
        registration: {
          id: room.registration.id,
          roomInChargeName: room.registration.roomInChargeName,
          roomInChargeEmail: room.registration.roomInChargeEmail,
          roomInChargeMobile: room.registration.roomInChargeMobile,
          roomInChargeChurch: room.registration.roomInChargeChurch,
          pdpaConsent: room.registration.pdpaConsent,
          pdpaConsentAt: room.registration.pdpaConsentAt?.toISOString() ?? null,
          createdAt: room.registration.createdAt.toISOString(),
        },
        event: room.campEvent,
        occupants,
      },
    });
  } catch (err) {
    console.error("[admin/registrations/[id] GET] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch registration" },
      { status: 500 }
    );
  }
}

// ─── PUT — update payment status / admin notes ───────────────────────────────

const UpdateSchema = z.object({
  paymentStatus: z.enum(["UNPAID", "PAID", "PARTIAL"]).optional(),
  adminNotes: z.string().max(2000, "Notes must be 2000 characters or less").optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const result = await requireAdminSession();
  if (result instanceof NextResponse) return result;
  const session = result;
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { paymentStatus, adminNotes } = parsed.data;

    // Only update fields that were provided
    const data: Record<string, unknown> = {};
    if (paymentStatus !== undefined) data.paymentStatus = paymentStatus;
    if (adminNotes !== undefined) data.adminNotes = adminNotes;

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const room = await prisma.room.update({
      where: { id: params.id },
      data,
    });

    // Audit log
    void logAudit({
      userId: session.user.id,
      action: "UPDATE_PAYMENT",
      targetTable: "Room",
      targetId: room.id,
      ipAddress: getClientIp(req),
    });

    return NextResponse.json({
      data: {
        id: room.id,
        paymentStatus: room.paymentStatus,
        adminNotes: room.adminNotes,
      },
    });
  } catch (err) {
    console.error("[admin/registrations/[id] PUT] Error:", err);
    return NextResponse.json(
      { error: "Failed to update registration" },
      { status: 500 }
    );
  }
}
