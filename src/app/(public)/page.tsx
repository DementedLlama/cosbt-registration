import Link from "next/link";
import { prisma } from "@/lib/prisma";

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

export default async function LandingPage() {
  const event = await getActiveEvent();

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {event ? (
        <>
          {/* Camp event hero */}
          <div className="text-center mb-10">
            <h2
              className="text-3xl font-bold mb-2"
              style={{ color: "var(--color-primary)" }}
            >
              {event.name}
            </h2>
            <p className="text-gray-600 text-lg">{event.description}</p>
          </div>

          {/* Event details card */}
          <div className="card p-6 mb-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">
              Event Details
            </h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="font-medium text-gray-500">Dates</dt>
                <dd className="text-gray-900">
                  {event.startDate.toLocaleDateString("en-SG", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}{" "}
                  –{" "}
                  {event.endDate.toLocaleDateString("en-SG", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500">Venue / Hotel</dt>
                <dd className="text-gray-900">
                  {event.venue}
                  {event.hotelName && ` — ${event.hotelName}`}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500">
                  Registration Deadline
                </dt>
                <dd className="text-gray-900">
                  {event.registrationDeadline.toLocaleDateString("en-SG", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </dd>
              </div>
            </dl>
          </div>

          {/* Room rates */}
          {event.pricingRubric && (
            <div className="card p-6 mb-8">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">
                Room Rates (per person)
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 text-gray-500 font-medium">
                      Room Type
                    </th>
                    <th className="text-right py-2 text-gray-500 font-medium">
                      Adult
                    </th>
                    <th className="text-right py-2 text-gray-500 font-medium">
                      Student
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="py-2">Single</td>
                    <td className="text-right py-2">
                      S${Number(event.pricingRubric.singleAdultRate).toFixed(2)}
                    </td>
                    <td className="text-right py-2">
                      S$
                      {Number(event.pricingRubric.singleStudentRate).toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2">Twin</td>
                    <td className="text-right py-2">
                      S${Number(event.pricingRubric.twinAdultRate).toFixed(2)}
                    </td>
                    <td className="text-right py-2">
                      S$
                      {Number(event.pricingRubric.twinStudentRate).toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2">Triple</td>
                    <td className="text-right py-2">
                      S$
                      {Number(event.pricingRubric.tripleAdultRate).toFixed(2)}
                    </td>
                    <td className="text-right py-2">
                      S$
                      {Number(event.pricingRubric.tripleStudentRate).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className="text-xs text-gray-500 mt-3">
                Child (Primary, ages 7–12): +S$
                {Number(event.pricingRubric.childPrimaryRate).toFixed(2)} add-on
                · Child (Preschool, ages 0–6): Free · Extra bed (CWB): +S$
                {Number(event.pricingRubric.extraBedRate).toFixed(2)}
              </p>
            </div>
          )}

          {/* CTA */}
          <div className="text-center">
            <Link href="/register" className="btn-primary text-lg px-10 py-4">
              Register Your Room Now
            </Link>
            <p className="text-sm text-gray-500 mt-3">
              Each room requires a separate submission. One invoice per room.
            </p>
          </div>
        </>
      ) : (
        /* No active event */
        <div className="text-center py-20">
          <div
            className="text-6xl mb-6"
            style={{ color: "var(--color-primary)" }}
          >
            ✝
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            No Active Camp Event
          </h2>
          <p className="text-gray-500">
            Registration is not currently open. Please check back later or
            contact the church office.
          </p>
        </div>
      )}
    </div>
  );
}
