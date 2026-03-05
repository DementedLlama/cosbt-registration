/**
 * Admin — Registration Detail page
 * Server component: fetches room detail with occupants, renders detail + payment update.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { decrypt, isEncrypted } from "@/lib/encryption";
import { logAudit } from "@/lib/audit";
import Link from "next/link";
import PaymentStatusForm from "@/components/admin/PaymentStatusForm";

async function getRoomDetail(id: string) {
  try {
    return await prisma.room.findUnique({
      where: { id },
      include: {
        registration: true,
        campEvent: { select: { id: true, name: true, hotelName: true } },
        occupants: { orderBy: { createdAt: "asc" } },
      },
    });
  } catch {
    return null;
  }
}

function formatDate(date: Date) {
  try {
    return date.toLocaleDateString("en-SG", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

const STATUS_STYLES: Record<string, string> = {
  UNPAID: "bg-red-100 text-red-700",
  PAID: "bg-green-100 text-green-700",
  PARTIAL: "bg-amber-100 text-amber-700",
};

const OCCUPANT_TYPE_LABELS: Record<string, string> = {
  ADULT: "Adult",
  CHILD_PRIMARY: "Child (Primary)",
  CHILD_PRESCHOOL: "Child (Preschool)",
};

const BED_TYPE_LABELS: Record<string, string> = {
  CWB: "Extra Bed",
  CWOB: "No Extra Bed",
  NOT_APPLICABLE: "—",
};

export default async function RegistrationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/admin/login");

  const room = await getRoomDetail(params.id);

  if (!room) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Registration Not Found
        </h1>
        <div className="card p-8 text-center text-gray-500">
          <p className="mb-4">
            The registration you&apos;re looking for doesn&apos;t exist.
          </p>
          <Link
            href="/admin/registrations"
            className="btn-secondary text-sm py-2 inline-block"
          >
            &larr; Back to Registrations
          </Link>
        </div>
      </div>
    );
  }

  const canEdit =
    session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  const canDecrypt = canEdit;

  // Audit passport view for authorized roles
  if (canDecrypt) {
    void logAudit({
      userId: session.user.id,
      action: "VIEW_PASSPORT",
      targetTable: "Room",
      targetId: room.id,
    });
  }

  // Decrypt passports
  const occupants = room.occupants.map((occ) => {
    let passportDisplay: string;
    if (canDecrypt && isEncrypted(occ.passportNumber)) {
      try {
        passportDisplay = decrypt(occ.passportNumber);
      } catch {
        passportDisplay = "[decryption error]";
      }
    } else if (canDecrypt) {
      passportDisplay = occ.passportNumber;
    } else {
      passportDisplay = "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";
    }

    return {
      ...occ,
      passportDisplay,
    };
  });

  const reg = room.registration;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/registrations"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          &larr; Registrations
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {room.invoiceNumber}
        </h1>
        <span
          className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${
            STATUS_STYLES[room.paymentStatus] || ""
          }`}
        >
          {room.paymentStatus}
        </span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="text-xs text-gray-500 mb-1">Package</div>
          <div className="text-lg font-bold text-gray-900">
            {room.packageType}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-gray-500 mb-1">Total Amount</div>
          <div className="text-lg font-bold text-gray-900">
            ${Number(room.totalAmount).toFixed(2)}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-gray-500 mb-1">Occupants</div>
          <div className="text-lg font-bold text-gray-900">
            {room.occupants.length}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-gray-500 mb-1">Submitted</div>
          <div className="text-sm font-medium text-gray-900">
            {formatDate(room.createdAt)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Room I/C + Occupants */}
        <div className="lg:col-span-2 space-y-6">
          {/* Room In-Charge */}
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
              Room In-Charge
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow label="Full Name" value={reg.roomInChargeName} />
              <InfoRow label="Email" value={reg.roomInChargeEmail} />
              <InfoRow label="Mobile" value={reg.roomInChargeMobile} />
              <InfoRow label="Church / Ministry" value={reg.roomInChargeChurch} />
              <InfoRow
                label="PDPA Consent"
                value={
                  reg.pdpaConsent
                    ? `Yes${reg.pdpaConsentAt ? ` (${formatDate(reg.pdpaConsentAt)})` : ""}`
                    : "No"
                }
              />
            </div>
          </div>

          {/* Occupants */}
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
              Occupants ({occupants.length})
            </h2>
            <div className="space-y-4">
              {occupants.map((occ, idx) => (
                <div
                  key={occ.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold text-gray-400">
                      #{idx + 1}
                    </span>
                    <span className="font-medium text-gray-900">
                      {occ.fullName}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {OCCUPANT_TYPE_LABELS[occ.occupantType] || occ.occupantType}
                    </span>
                    {occ.isStudent && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        Student
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-gray-500">Nationality</div>
                      <div className="text-gray-900">{occ.nationality}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">
                        Passport / NRIC
                      </div>
                      <div className="text-gray-900 font-mono text-xs">
                        {occ.passportDisplay}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">
                        Passport Expiry
                      </div>
                      <div className="text-gray-900">
                        {formatDate(occ.passportExpiry)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Bed Type</div>
                      <div className="text-gray-900">
                        {BED_TYPE_LABELS[occ.bedType] || occ.bedType}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Event info + Payment update */}
        <div className="space-y-6">
          {/* Event info */}
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
              Event
            </h2>
            <InfoRow label="Event Name" value={room.campEvent.name} />
            <div className="mt-2">
              <InfoRow label="Hotel" value={room.campEvent.hotelName} />
            </div>
          </div>

          {/* Payment status */}
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
              Payment
            </h2>
            {canEdit ? (
              <PaymentStatusForm
                roomId={room.id}
                currentStatus={room.paymentStatus}
                currentNotes={room.adminNotes ?? ""}
              />
            ) : (
              <div className="space-y-3">
                <InfoRow label="Status" value={room.paymentStatus} />
                {room.adminNotes && (
                  <InfoRow label="Notes" value={room.adminNotes} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-gray-500 mb-0.5">{label}</div>
      <div className="text-sm text-gray-900">{value}</div>
    </div>
  );
}
