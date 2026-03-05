/**
 * Admin — Pricing Rubric list page
 * Shows all camp events with their pricing status. Click an event to set/edit rates.
 */
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getEvents() {
  try {
    return await prisma.campEvent.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        pricingRubric: { select: { id: true } },
      },
    });
  } catch {
    return null;
  }
}

function formatDate(date: Date) {
  try {
    const str = date.toLocaleDateString("en-SG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return str === "Invalid Date" ? "—" : str;
  } catch {
    return "—";
  }
}

export default async function PricingPage() {
  const session = await getServerSession(authOptions);
  const events = await getEvents();
  const canEdit =
    session?.user.role === "ADMIN" || session?.user.role === "SUPER_ADMIN";

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Pricing Rubric</h1>

      {events === null ? (
        <div className="card p-8 text-center text-red-600 text-sm">
          Failed to load events. Please check the database connection.
        </div>
      ) : events.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">
          <p className="text-lg font-medium mb-2">No Camp Events</p>
          <p className="text-sm">
            Create a camp event first, then set up pricing.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Event
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Dates
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">
                    Hotel
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">
                    Pricing Status
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">
                        {event.name}
                      </span>
                      {event.isActive && (
                        <span className="ml-2 inline-block bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {formatDate(event.startDate)} –{" "}
                      {formatDate(event.endDate)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {event.hotelName}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {event.pricingRubric ? (
                        <span className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                          Configured
                        </span>
                      ) : (
                        <span className="inline-block bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                          Not Set
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/admin/pricing/${event.id}`}
                        className="text-xs font-medium px-3 py-1 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                      >
                        {canEdit
                          ? event.pricingRubric
                            ? "Edit Rates"
                            : "Set Rates"
                          : "View Rates"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
