/**
 * Admin — Camp Events list page
 * Server component: fetches events directly from DB via Prisma.
 */
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ToggleActiveButton from "@/components/admin/ToggleActiveButton";

async function getEvents() {
  try {
    return await prisma.campEvent.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { registrations: true, rooms: true } },
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

export default async function EventsPage() {
  const session = await getServerSession(authOptions);
  const events = await getEvents();
  const canEdit =
    session?.user.role === "ADMIN" || session?.user.role === "SUPER_ADMIN";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Camp Events</h1>
        {canEdit && (
          <Link href="/admin/events/new" className="btn-primary text-sm py-2">
            + Create Event
          </Link>
        )}
      </div>

      {events === null ? (
        <div className="card p-8 text-center text-red-600 text-sm">
          Failed to load events. Please check the database connection.
        </div>
      ) : events.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">
          <p className="text-lg font-medium mb-2">No Camp Events</p>
          <p className="text-sm">
            {canEdit
              ? "Create your first camp event to get started."
              : "No events have been created yet."}
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
                    Status
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">
                    Registrations
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">
                    Pricing
                  </th>
                  {canEdit && (
                    <th className="text-center px-4 py-3 font-medium text-gray-600">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/events/${event.id}`}
                        className="font-medium text-gray-900 hover:text-[var(--color-primary)] transition-colors"
                      >
                        {event.name}
                      </Link>
                      {event.description && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">
                          {event.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {formatDate(event.startDate)} – {formatDate(event.endDate)}
                      <div className="text-xs text-gray-400 mt-0.5">
                        Deadline: {formatDate(event.registrationDeadline)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {event.hotelName}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {event.isActive ? (
                        <span className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      ) : (
                        <span className="inline-block bg-gray-100 text-gray-500 text-xs font-semibold px-2 py-0.5 rounded-full">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {event._count.registrations}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {event.pricingRubric ? (
                        <span className="text-green-600 text-xs font-medium">
                          ✓ Set
                        </span>
                      ) : (
                        <span className="text-amber-500 text-xs font-medium">
                          Not set
                        </span>
                      )}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/admin/events/${event.id}`}
                            className="text-xs font-medium px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                          >
                            Edit
                          </Link>
                          <ToggleActiveButton
                            eventId={event.id}
                            isActive={event.isActive}
                          />
                        </div>
                      </td>
                    )}
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
