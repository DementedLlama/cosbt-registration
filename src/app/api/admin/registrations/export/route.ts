/**
 * GET /api/admin/registrations/export — download registrations as Excel
 * Query params: ?eventId=xxx (optional, filters by event)
 * Requires ADMIN or SUPER_ADMIN role.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit, getClientIp } from "@/lib/audit";
import ExcelJS from "exceljs";

export async function GET(req: NextRequest) {
  const result = await requireAdminSession();
  if (result instanceof NextResponse) return result;
  const session = result;
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const eventId = req.nextUrl.searchParams.get("eventId") || undefined;

  const rooms = await prisma.room.findMany({
    where: eventId ? { campEventId: eventId } : {},
    orderBy: { createdAt: "desc" },
    include: {
      registration: {
        select: {
          roomInChargeName: true,
          roomInChargeEmail: true,
          roomInChargeMobile: true,
          roomInChargeChurch: true,
        },
      },
      campEvent: { select: { name: true } },
      occupants: {
        orderBy: { createdAt: "asc" },
        select: {
          fullName: true,
          dateOfBirth: true,
          nationality: true,
          occupantType: true,
          isStudent: true,
          bedType: true,
          transportMode: true,
        },
      },
    },
  });

  // Build Excel workbook
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Registrations");

  sheet.columns = [
    { header: "Invoice", key: "invoice", width: 18 },
    { header: "Event", key: "event", width: 25 },
    { header: "Room I/C", key: "roomIC", width: 22 },
    { header: "Email", key: "email", width: 28 },
    { header: "Mobile", key: "mobile", width: 16 },
    { header: "Church", key: "church", width: 22 },
    { header: "Package", key: "package", width: 10 },
    { header: "Bed Config", key: "bedConfig", width: 16 },
    { header: "Payment", key: "payment", width: 10 },
    { header: "Total (S$)", key: "total", width: 12 },
    { header: "Occupant", key: "occupant", width: 22 },
    { header: "DOB", key: "dob", width: 12 },
    { header: "Nationality", key: "nationality", width: 16 },
    { header: "Type", key: "type", width: 16 },
    { header: "Student", key: "student", width: 8 },
    { header: "Bed", key: "bed", width: 16 },
    { header: "Transport", key: "transport", width: 14 },
    { header: "Registered", key: "registered", width: 18 },
  ];

  // Bold header row
  sheet.getRow(1).font = { bold: true };

  for (const room of rooms) {
    const reg = room.registration;
    for (const occ of room.occupants) {
      sheet.addRow({
        invoice: room.invoiceNumber,
        event: room.campEvent.name,
        roomIC: reg.roomInChargeName,
        email: reg.roomInChargeEmail,
        mobile: reg.roomInChargeMobile,
        church: reg.roomInChargeChurch,
        package: room.packageType,
        bedConfig: room.bedConfig === "KING_BED" ? "King bed" : "Twin beds",
        payment: room.paymentStatus,
        total: Number(room.totalAmount),
        occupant: occ.fullName,
        dob: occ.dateOfBirth.toISOString().split("T")[0],
        nationality: occ.nationality,
        type: occ.occupantType.replace(/_/g, " "),
        student: occ.isStudent ? "Yes" : "No",
        bed: occ.bedType.replace(/_/g, " "),
        transport: occ.transportMode === "COACH" ? "Coach" : "Own",
        registered: room.createdAt.toISOString().split("T")[0],
      });
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();

  void logAudit({
    userId: session.user.id,
    action: "EXPORT_MANIFEST",
    targetTable: "Room",
    targetId: eventId ?? "all",
    ipAddress: getClientIp(req),
  });

  const filename = eventId
    ? `registrations-${eventId.slice(0, 8)}.xlsx`
    : "registrations-all.xlsx";

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
