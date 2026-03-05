/**
 * Admin — Edit Camp Event
 * Server component: fetches event data, passes to EventForm client component.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EventForm from "@/components/admin/EventForm";
import Link from "next/link";

async function getEvent(id: string) {
  try {
    return await prisma.campEvent.findUnique({
      where: { id },
      include: {
        _count: { select: { registrations: true, rooms: true } },
      },
    });
  } catch {
    return null;
  }
}

/** Format a Date to "YYYY-MM-DD" for <input type="date"> */
function toDateInputValue(date: Date) {
  try {
    return date.toISOString().split("T")[0];
  } catch {
    return "";
  }
}

export default async function EventDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/admin/login");

  const event = await getEvent(params.id);

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
            href="/admin/events"
            className="btn-secondary text-sm py-2 inline-block"
          >
            ← Back to Events
          </Link>
        </div>
      </div>
    );
  }

  const canEdit =
    session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin/events"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          ← Events
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          {canEdit ? "Edit Event" : "Event Details"}
        </h1>
        {event.isActive && (
          <span className="inline-block bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
            Active
          </span>
        )}
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card p-4">
          <div className="text-xs text-gray-500 mb-1">Registrations</div>
          <div className="text-xl font-bold text-gray-900">
            {event._count.registrations}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-gray-500 mb-1">Rooms Booked</div>
          <div className="text-xl font-bold text-gray-900">
            {event._count.rooms}
          </div>
        </div>
      </div>

      {canEdit ? (
        <div className="card p-6">
          <EventForm
            mode="edit"
            eventId={event.id}
            initialData={{
              name: event.name,
              venue: event.venue,
              hotelName: event.hotelName,
              startDate: toDateInputValue(event.startDate),
              endDate: toDateInputValue(event.endDate),
              registrationDeadline: toDateInputValue(
                event.registrationDeadline
              ),
              description: event.description ?? "",
              isActive: event.isActive,
            }}
          />
        </div>
      ) : (
        <div className="card p-6 space-y-4">
          <InfoRow label="Event Name" value={event.name} />
          <InfoRow label="Venue" value={event.venue} />
          <InfoRow label="Hotel" value={event.hotelName} />
          <InfoRow
            label="Start Date"
            value={event.startDate.toLocaleDateString("en-SG", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          />
          <InfoRow
            label="End Date"
            value={event.endDate.toLocaleDateString("en-SG", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          />
          <InfoRow
            label="Registration Deadline"
            value={event.registrationDeadline.toLocaleDateString("en-SG", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          />
          {event.description && (
            <InfoRow label="Description" value={event.description} />
          )}
          <InfoRow
            label="Status"
            value={event.isActive ? "Active" : "Inactive"}
          />
        </div>
      )}
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
