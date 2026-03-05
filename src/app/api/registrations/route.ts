/**
 * POST /api/registrations — create a new registration + room + occupants
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { generateInvoiceNumber } from "@/lib/invoice";
import { logAudit, getClientIp } from "@/lib/audit";
import { sendInvoiceEmail } from "@/lib/email";

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const OccupantSchema = z
  .object({
    fullName: z.string().min(1, "Full name is required"),
    nationality: z.string().min(1, "Nationality is required"),
    passportNumber: z.string().min(1, "Passport / NRIC number is required"),
    // Bug fix: validate format AND that the date is strictly in the future
    passportExpiry: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (expected YYYY-MM-DD)")
      .refine(
        (s) => new Date(s) > new Date(),
        "Passport / NRIC must not be expired"
      ),
    occupantType: z.enum(["ADULT", "CHILD_PRIMARY", "CHILD_PRESCHOOL"]),
    isStudent: z.boolean(),
    bedType: z.enum(["CWB", "CWOB", "NOT_APPLICABLE"]),
  })
  // Bug fix: cross-field rules — enforce type-consistent bed/student values
  .refine(
    (o) => o.occupantType === "ADULT" || !o.isStudent,
    { message: "isStudent may only be true for ADULT occupants", path: ["isStudent"] }
  )
  .refine(
    (o) => o.occupantType !== "ADULT" || o.bedType === "NOT_APPLICABLE",
    { message: "Adults must have bedType NOT_APPLICABLE", path: ["bedType"] }
  )
  .refine(
    (o) => o.occupantType === "ADULT" || o.bedType !== "NOT_APPLICABLE",
    { message: "Children must have a bed arrangement (CWB or CWOB)", path: ["bedType"] }
  );

const RegistrationSchema = z.object({
  campEventId: z.string().min(1, "Camp event ID is required"),
  roomInChargeName: z.string().min(1, "Room I/C name is required"),
  roomInChargeEmail: z.string().email("Invalid email address"),
  roomInChargeMobile: z.string().min(1, "Mobile number is required"),
  roomInChargeChurch: z.string().min(1, "Church / ministry is required"),
  pdpaConsent: z.literal(true),
  occupants: z
    .array(OccupantSchema)
    .min(1, "At least one occupant is required")
    .max(20, "Too many occupants"),
});

type OccupantInput = z.infer<typeof OccupantSchema>;

// ─── Pricing helpers ──────────────────────────────────────────────────────────

function determinePackageType(
  occupants: OccupantInput[]
): "SINGLE" | "TWIN" | "TRIPLE" {
  const count = occupants.filter((o) => o.occupantType === "ADULT").length;
  if (count <= 1) return "SINGLE";
  if (count === 2) return "TWIN";
  return "TRIPLE";
}

type PricingRecord = {
  singleAdultRate: unknown;
  twinAdultRate: unknown;
  tripleAdultRate: unknown;
  singleStudentRate: unknown;
  twinStudentRate: unknown;
  tripleStudentRate: unknown;
  childPrimaryRate: unknown;
  extraBedRate: unknown;
  preschoolRate: unknown;
};

function calculateTotalAmount(
  occupants: OccupantInput[],
  pricing: PricingRecord
): number {
  const pkg = determinePackageType(occupants);
  let total = 0;

  for (const o of occupants) {
    if (o.occupantType === "ADULT") {
      if (o.isStudent) {
        total +=
          pkg === "SINGLE"
            ? Number(pricing.singleStudentRate)
            : pkg === "TWIN"
              ? Number(pricing.twinStudentRate)
              : Number(pricing.tripleStudentRate);
      } else {
        total +=
          pkg === "SINGLE"
            ? Number(pricing.singleAdultRate)
            : pkg === "TWIN"
              ? Number(pricing.twinAdultRate)
              : Number(pricing.tripleAdultRate);
      }
    } else if (o.occupantType === "CHILD_PRIMARY") {
      total += Number(pricing.childPrimaryRate);
      // CWB extra bed applies to CHILD_PRIMARY
      if (o.bedType === "CWB") {
        total += Number(pricing.extraBedRate);
      }
    } else {
      // CHILD_PRESCHOOL: base rate is always 0 (preschoolRate), but CWB
      // extra bed is still a physical bed and must be charged.
      // Bug fix: previously this branch was missing, causing a price
      // discrepancy between the frontend estimate and the stored totalAmount.
      if (o.bedType === "CWB") {
        total += Number(pricing.extraBedRate);
      }
    }
  }

  return Math.round(total * 100) / 100;
}

// ─── Email template ───────────────────────────────────────────────────────────

/** Escape HTML special characters to prevent XSS in email templates. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildInvoiceHtml(params: {
  invoiceNumber: string;
  roomInChargeName: string;
  roomInChargeEmail: string;
  roomInChargeMobile: string;
  roomInChargeChurch: string;
  eventName: string;
  eventDates: string;
  hotelName: string;
  packageType: string;
  occupants: OccupantInput[];
  totalAmount: number;
}): string {
  const occupantRows = params.occupants
    .map((o) => {
      const typeLabel =
        o.occupantType === "ADULT"
          ? o.isStudent
            ? "Student"
            : "Adult"
          : o.occupantType === "CHILD_PRIMARY"
            ? "Child (Primary, 7–12)"
            : "Child (Preschool, 0–6)";
      const bedNote =
        o.bedType === "CWB"
          ? " + extra bed"
          : o.bedType === "CWOB"
            ? " (shares bed)"
            : "";
      return `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">${escapeHtml(o.fullName)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">${typeLabel}${bedNote}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee">${escapeHtml(o.nationality)}</td>
        </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;color:#333;background:#f4f4f4">
  <div style="max-width:600px;margin:24px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="background:#8b0000;color:#fff;padding:24px 28px;text-align:center">
      <h1 style="margin:0;font-size:20px;font-weight:700">Church of Singapore (Bukit Timah)</h1>
      <p style="margin:4px 0 0;font-size:14px;opacity:0.85">Camp Hotel Registration</p>
    </div>
    <div style="padding:28px">
      <h2 style="color:#8b0000;margin-top:0;font-size:18px">Invoice Confirmation</h2>
      <p style="margin-bottom:4px">Dear <strong>${escapeHtml(params.roomInChargeName)}</strong>,</p>
      <p style="color:#555;margin-top:4px">
        Your room registration has been received. Please keep this email as your invoice.
        Payment instructions will be sent separately by the church office.
      </p>

      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px">
        <tr>
          <td style="padding:6px 0;color:#777;width:45%">Invoice Number</td>
          <td style="padding:6px 0;font-weight:700;font-size:16px;color:#8b0000">${escapeHtml(params.invoiceNumber)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#777">Camp Event</td>
          <td style="padding:6px 0">${escapeHtml(params.eventName)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#777">Dates</td>
          <td style="padding:6px 0">${escapeHtml(params.eventDates)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#777">Hotel</td>
          <td style="padding:6px 0">${escapeHtml(params.hotelName)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#777">Room Package</td>
          <td style="padding:6px 0">${escapeHtml(params.packageType)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#777">Church / Ministry</td>
          <td style="padding:6px 0">${escapeHtml(params.roomInChargeChurch)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#777">Contact Mobile</td>
          <td style="padding:6px 0">${escapeHtml(params.roomInChargeMobile)}</td>
        </tr>
      </table>

      <h3 style="font-size:15px;margin-bottom:8px">Room Occupants</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
        <thead>
          <tr style="background:#f5f5f5">
            <th style="padding:8px 12px;text-align:left;font-weight:600">Name</th>
            <th style="padding:8px 12px;text-align:left;font-weight:600">Type</th>
            <th style="padding:8px 12px;text-align:left;font-weight:600">Nationality</th>
          </tr>
        </thead>
        <tbody>${occupantRows}</tbody>
      </table>

      <div style="background:#faf5f5;border:1px solid #e8cece;border-radius:6px;padding:16px;text-align:right">
        <div style="font-size:18px;font-weight:700;color:#8b0000">
          Total Amount: S$${params.totalAmount.toFixed(2)}
        </div>
        <div style="font-size:12px;color:#999;margin-top:4px">
          Payment Status: UNPAID — Await payment instructions from the church office
        </div>
      </div>

      <p style="margin-top:20px;font-size:13px;color:#666">
        For additional rooms, please visit the registration portal again and submit a new form.<br>
        For changes or cancellations, contact the church office quoting your invoice number.
      </p>
    </div>
    <div style="padding:16px 28px;background:#f9f9f9;border-top:1px solid #eee;text-align:center;font-size:12px;color:#aaa">
      © ${new Date().getFullYear()} Church of Singapore (Bukit Timah). All rights reserved.
    </div>
  </div>
</body>
</html>`;
}

// ─── Route handlers ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // 1. Validate with Zod
  const parsed = RegistrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed.", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const data = parsed.data;

  // 2. Business rule validation
  const adultStudentCount = data.occupants.filter(
    (o) => o.occupantType === "ADULT"
  ).length;

  if (adultStudentCount === 0) {
    return NextResponse.json(
      { error: "At least one adult or student occupant is required." },
      { status: 422 }
    );
  }
  if (adultStudentCount > 3) {
    return NextResponse.json(
      {
        error:
          "A room can have a maximum of 3 adults/students (TRIPLE room). Please submit separate registrations for additional rooms.",
      },
      { status: 422 }
    );
  }

  const cwbCount = data.occupants.filter((o) => o.bedType === "CWB").length;
  if (cwbCount > 1) {
    return NextResponse.json(
      { error: "A room can have at most 1 extra bed (CWB)." },
      { status: 422 }
    );
  }

  // 3. Fetch active event and pricing
  const event = await prisma.campEvent.findFirst({
    where: { id: data.campEventId, isActive: true },
    include: { pricingRubric: true },
  });

  if (!event) {
    return NextResponse.json(
      { error: "No active camp event found. Please refresh and try again." },
      { status: 404 }
    );
  }
  if (!event.pricingRubric) {
    return NextResponse.json(
      {
        error:
          "Pricing has not been configured for this event. Please contact the church office.",
      },
      { status: 400 }
    );
  }

  // 4. Check registration deadline
  if (event.registrationDeadline < new Date()) {
    return NextResponse.json(
      { error: "Registration has closed for this event." },
      { status: 403 }
    );
  }

  // 5. Calculate package type and total amount
  const packageType = determinePackageType(data.occupants);
  const totalAmount = calculateTotalAmount(data.occupants, event.pricingRubric);

  // 6. Generate invoice number (own SERIALIZABLE transaction — must happen before DB write)
  let invoiceNumber: string;
  try {
    invoiceNumber = await generateInvoiceNumber();
  } catch (err) {
    console.error("[registrations] Invoice generation failed:", err);
    return NextResponse.json(
      { error: "Failed to generate invoice number. Please try again." },
      { status: 500 }
    );
  }

  // 7. Create registration + room + occupants in a single transaction
  let registration;
  try {
    registration = await prisma.registration.create({
      data: {
        campEventId: data.campEventId,
        roomInChargeName: data.roomInChargeName,
        roomInChargeEmail: data.roomInChargeEmail,
        roomInChargeMobile: data.roomInChargeMobile,
        roomInChargeChurch: data.roomInChargeChurch,
        pdpaConsent: data.pdpaConsent,
        pdpaConsentAt: new Date(),
        rooms: {
          create: {
            campEventId: data.campEventId,
            packageType,
            invoiceNumber,
            totalAmount,
            occupants: {
              create: data.occupants.map((o) => ({
                fullName: o.fullName,
                nationality: o.nationality,
                passportNumber: encrypt(o.passportNumber),
                passportExpiry: new Date(o.passportExpiry),
                occupantType: o.occupantType,
                isStudent: o.isStudent,
                bedType: o.bedType,
              })),
            },
          },
        },
      },
      include: { rooms: true },
    });
  } catch (err) {
    console.error("[registrations] DB write failed:", err);
    return NextResponse.json(
      { error: "Failed to save registration. Please try again." },
      { status: 500 }
    );
  }

  // 8. Best-effort audit log
  void logAudit({
    action: "CREATE_REGISTRATION",
    targetTable: "Registration",
    targetId: registration.id,
    ipAddress: getClientIp(req),
  });

  // 9. Best-effort confirmation email
  const htmlBody = buildInvoiceHtml({
    invoiceNumber,
    roomInChargeName: data.roomInChargeName,
    roomInChargeEmail: data.roomInChargeEmail,
    roomInChargeMobile: data.roomInChargeMobile,
    roomInChargeChurch: data.roomInChargeChurch,
    eventName: event.name,
    eventDates: `${event.startDate.toLocaleDateString("en-SG")} – ${event.endDate.toLocaleDateString("en-SG")}`,
    hotelName: event.hotelName,
    packageType,
    occupants: data.occupants,
    totalAmount,
  });

  void sendInvoiceEmail({
    to: data.roomInChargeEmail,
    invoiceNumber,
    roomInChargeName: data.roomInChargeName,
    totalAmount,
    htmlBody,
  }).catch((err) => {
    console.error("[registrations] Email send failed:", err);
  });

  return NextResponse.json(
    {
      success: true,
      invoiceNumber,
      registrationId: registration.id,
      totalAmount,
    },
    { status: 201 }
  );
}

