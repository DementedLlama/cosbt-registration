/**
 * Standalone Excel export test — bypasses auth to export all registrations.
 *
 * Run with:
 *   DATABASE_URL="postgresql://cosbt:cosbt@localhost:5432/cosbt_camp" npx tsx prisma/export-test.ts
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import ExcelJS from "exceljs";
import { writeFileSync } from "fs";
import path from "path";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not set.");

const adapter = new PrismaPg({ connectionString: databaseUrl });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log("[export] Querying all rooms...");
  const startQuery = Date.now();

  const rooms = await prisma.room.findMany({
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

  const queryMs = Date.now() - startQuery;
  const totalOccupants = rooms.reduce((sum, r) => sum + r.occupants.length, 0);
  console.log(`[export] Query done in ${queryMs}ms — ${rooms.length} rooms, ${totalOccupants} occupants`);

  // Build Excel workbook (same logic as the API route)
  const startExcel = Date.now();
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
  const excelMs = Date.now() - startExcel;

  const outPath = path.join(process.cwd(), "registrations-export-test.xlsx");
  writeFileSync(outPath, Buffer.from(buffer));

  console.log(`[export] Excel built in ${excelMs}ms — ${totalOccupants} rows`);
  console.log(`[export] Saved to: ${outPath}`);
  console.log(`[export] File size: ${(Buffer.from(buffer).length / 1024).toFixed(1)} KB`);
}

main()
  .catch((e) => {
    console.error("[export] Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
