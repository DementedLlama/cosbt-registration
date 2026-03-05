/**
 * Admin — Set / Edit Pricing for a Camp Event
 * Server component: fetches event + existing pricing, renders PricingForm.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PricingForm from "@/components/admin/PricingForm";
import Link from "next/link";
import { Decimal } from "@/generated/prisma/internal/prismaNamespace";

async function getEventWithPricing(eventId: string) {
  try {
    return await prisma.campEvent.findUnique({
      where: { id: eventId },
      include: { pricingRubric: true },
    });
  } catch {
    return null;
  }
}

function decimalToString(d: Decimal): string {
  const n = Number(d);
  return n % 1 === 0 ? n.toFixed(0) : n.toFixed(2);
}

export default async function PricingDetailPage({
  params,
}: {
  params: { eventId: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/admin/login");

  const event = await getEventWithPricing(params.eventId);

  if (!event) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Event Not Found
        </h1>
        <div className="card p-8 text-center text-gray-500">
          <p className="mb-4">
            The camp event you&apos;re looking for doesn&apos;t exist or has
            been removed.
          </p>
          <Link
            href="/admin/pricing"
            className="btn-secondary text-sm py-2 inline-block"
          >
            &larr; Back to Pricing
          </Link>
        </div>
      </div>
    );
  }

  const canEdit =
    session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
  const pricing = event.pricingRubric;

  const initialData = pricing
    ? {
        singleAdultRate: decimalToString(pricing.singleAdultRate),
        twinAdultRate: decimalToString(pricing.twinAdultRate),
        tripleAdultRate: decimalToString(pricing.tripleAdultRate),
        singleStudentRate: decimalToString(pricing.singleStudentRate),
        twinStudentRate: decimalToString(pricing.twinStudentRate),
        tripleStudentRate: decimalToString(pricing.tripleStudentRate),
        childPrimaryRate: decimalToString(pricing.childPrimaryRate),
        extraBedRate: decimalToString(pricing.extraBedRate),
        preschoolRate: decimalToString(pricing.preschoolRate),
        transportRate: decimalToString(pricing.transportRate),
      }
    : undefined;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/pricing"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          &larr; Pricing
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {pricing ? "Edit Pricing" : "Set Pricing"}
        </h1>
      </div>

      {/* Event info bar */}
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-3 text-sm">
          <span className="font-medium text-gray-900">{event.name}</span>
          {event.isActive && (
            <span className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              Active
            </span>
          )}
          <span className="text-gray-400">|</span>
          <span className="text-gray-600">{event.hotelName}</span>
        </div>
      </div>

      {canEdit ? (
        <div className="card p-6">
          <PricingForm
            campEventId={event.id}
            eventName={event.name}
            initialData={initialData}
          />
        </div>
      ) : (
        /* Read-only view for VIEW_ONLY users */
        <div className="card p-6">
          {pricing ? (
            <div className="space-y-6">
              <RateSection
                title="Adult Rates (per person)"
                rates={[
                  { label: "Single", value: pricing.singleAdultRate },
                  { label: "Twin", value: pricing.twinAdultRate },
                  { label: "Triple", value: pricing.tripleAdultRate },
                ]}
              />
              <RateSection
                title="Student Rates (per person)"
                rates={[
                  { label: "Single", value: pricing.singleStudentRate },
                  { label: "Twin", value: pricing.twinStudentRate },
                  { label: "Triple", value: pricing.tripleStudentRate },
                ]}
              />
              <RateSection
                title="Child & Add-on Rates"
                rates={[
                  {
                    label: "Primary School (7–12)",
                    value: pricing.childPrimaryRate,
                  },
                  {
                    label: "Extra Bed (CWB)",
                    value: pricing.extraBedRate,
                  },
                  {
                    label: "Preschool (0–6)",
                    value: pricing.preschoolRate,
                  },
                ]}
              />
              <RateSection
                title="Transport"
                rates={[
                  {
                    label: "Coach Transport (per person)",
                    value: pricing.transportRate,
                  },
                ]}
              />
            </div>
          ) : (
            <p className="text-gray-500 text-sm">
              Pricing has not been configured for this event yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function RateSection({
  title,
  rates,
}: {
  title: string;
  rates: { label: string; value: Decimal }[];
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
        {title}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {rates.map((r) => (
          <div key={r.label}>
            <div className="text-xs font-medium text-gray-500 mb-0.5">
              {r.label}
            </div>
            <div className="text-sm text-gray-900">
              ${Number(r.value).toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
