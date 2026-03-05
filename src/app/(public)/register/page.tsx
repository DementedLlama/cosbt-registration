import { prisma } from "@/lib/prisma";
import RegistrationWizard from "@/components/registration/RegistrationWizard";

async function getActiveEvent() {
  try {
    return await prisma.campEvent.findFirst({
      where: { isActive: true },
      include: { pricingRubric: true },
    });
  } catch {
    return null;
  }
}

export default async function RegisterPage() {
  const event = await getActiveEvent();

  // No active event
  if (!event) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <div
          className="text-5xl mb-5"
          style={{ color: "var(--color-primary)" }}
        >
          ✝
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-3">
          Registration Not Open
        </h2>
        <p className="text-gray-500">
          There is no active camp event at this time. Please check back later or
          contact the church office.
        </p>
      </div>
    );
  }

  // Deadline passed
  const deadlinePassed = event.registrationDeadline < new Date();
  if (deadlinePassed) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <div
          className="text-5xl mb-5"
          style={{ color: "var(--color-primary)" }}
        >
          ✝
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-3">
          Registration Closed
        </h2>
        <p className="text-gray-500">
          The registration deadline for <strong>{event.name}</strong> has
          passed (
          {event.registrationDeadline.toLocaleDateString("en-SG", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          ). Please contact the church office if you need to register late.
        </p>
      </div>
    );
  }

  // Convert Prisma Decimal → plain numbers for client component
  const pricing = event.pricingRubric
    ? {
        singleAdultRate: Number(event.pricingRubric.singleAdultRate),
        twinAdultRate: Number(event.pricingRubric.twinAdultRate),
        tripleAdultRate: Number(event.pricingRubric.tripleAdultRate),
        singleStudentRate: Number(event.pricingRubric.singleStudentRate),
        twinStudentRate: Number(event.pricingRubric.twinStudentRate),
        tripleStudentRate: Number(event.pricingRubric.tripleStudentRate),
        childPrimaryRate: Number(event.pricingRubric.childPrimaryRate),
        extraBedRate: Number(event.pricingRubric.extraBedRate),
        preschoolRate: Number(event.pricingRubric.preschoolRate),
        transportRate: Number(event.pricingRubric.transportRate),
      }
    : null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Event header */}
      <div className="mb-6">
        <h2
          className="text-2xl font-bold mb-1"
          style={{ color: "var(--color-primary)" }}
        >
          Room Registration
        </h2>
        <p className="text-gray-600 font-medium">
          {event.name}
          {event.hotelName && (
            <span className="text-gray-400 font-normal"> · {event.hotelName}</span>
          )}
        </p>
        <p className="text-sm text-gray-400 mt-0.5">
          Registration closes{" "}
          {event.registrationDeadline.toLocaleDateString("en-SG", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      <RegistrationWizard campEventId={event.id} pricing={pricing} />

      <p className="text-xs text-gray-400 text-center mt-6">
        Each room requires a separate submission. One invoice is generated per
        room.
      </p>
    </div>
  );
}
