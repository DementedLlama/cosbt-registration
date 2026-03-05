/**
 * Admin — Registrations list page
 * Server component: fetches rooms (registrations) from DB with search/filter/sort.
 */
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import RegistrationFilters from "@/components/admin/RegistrationFilters";
import { ExportButton } from "@/components/admin/ExportButton";

interface PageProps {
  searchParams: {
    search?: string;
    status?: string;
    eventId?: string;
    sort?: string;
    order?: string;
    page?: string;
  };
}

const LIMIT = 25;

async function getEvents() {
  try {
    return await prisma.campEvent.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true },
    });
  } catch {
    return [];
  }
}

async function getRooms(searchParams: PageProps["searchParams"]) {
  const search = searchParams.search?.trim() || "";
  const status = searchParams.status || "";
  const eventId = searchParams.eventId || "";
  const sortField = searchParams.sort || "createdAt";
  const sortOrder = searchParams.order === "asc" ? "asc" : "desc";
  const page = Math.max(1, parseInt(searchParams.page || "1", 10));
  const skip = (page - 1) * LIMIT;

  const where: Prisma.RoomWhereInput = {};

  if (status && ["UNPAID", "PAID", "PARTIAL"].includes(status)) {
    where.paymentStatus = status as "UNPAID" | "PAID" | "PARTIAL";
  }
  if (eventId) {
    where.campEventId = eventId;
  }
  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search, mode: "insensitive" } },
      {
        registration: {
          roomInChargeName: { contains: search, mode: "insensitive" },
        },
      },
      {
        registration: {
          roomInChargeEmail: { contains: search, mode: "insensitive" },
        },
      },
    ];
  }

  const orderByMap: Record<string, Prisma.RoomOrderByWithRelationInput> = {
    createdAt: { createdAt: sortOrder },
    totalAmount: { totalAmount: sortOrder },
    invoiceNumber: { invoiceNumber: sortOrder },
  };
  const orderBy = orderByMap[sortField] || { createdAt: "desc" };

  try {
    const [total, rooms] = await Promise.all([
      prisma.room.count({ where }),
      prisma.room.findMany({
        where,
        orderBy,
        skip,
        take: LIMIT,
        include: {
          registration: {
            select: {
              roomInChargeName: true,
              roomInChargeEmail: true,
              createdAt: true,
            },
          },
          campEvent: { select: { name: true } },
          _count: { select: { occupants: true } },
        },
      }),
    ]);
    return { rooms, total, page };
  } catch {
    return { rooms: null, total: 0, page: 1 };
  }
}

function formatDate(date: Date) {
  try {
    return date.toLocaleDateString("en-SG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatCurrency(amount: number | { toNumber?: () => number }) {
  const n = typeof amount === "number" ? amount : Number(amount);
  return `$${n.toFixed(2)}`;
}

const STATUS_STYLES: Record<string, string> = {
  UNPAID: "bg-red-100 text-red-700",
  PAID: "bg-green-100 text-green-700",
  PARTIAL: "bg-amber-100 text-amber-700",
};

export default async function RegistrationsPage({
  searchParams,
}: PageProps) {
  const [events, result] = await Promise.all([
    getEvents(),
    getRooms(searchParams),
  ]);

  const { rooms, total, page } = result;
  const totalPages = Math.ceil(total / LIMIT);

  // Build base URL for pagination links
  function pageUrl(p: number) {
    const params = new URLSearchParams();
    if (searchParams.search) params.set("search", searchParams.search);
    if (searchParams.status) params.set("status", searchParams.status);
    if (searchParams.eventId) params.set("eventId", searchParams.eventId);
    if (searchParams.sort) params.set("sort", searchParams.sort);
    if (searchParams.order) params.set("order", searchParams.order);
    params.set("page", String(p));
    return `/admin/registrations?${params.toString()}`;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Registrations</h1>
        <ExportButton eventId={searchParams.eventId} />
      </div>

      {/* Filters */}
      <RegistrationFilters events={events} />

      {rooms === null ? (
        <div className="card p-8 text-center text-red-600 text-sm">
          Failed to load registrations. Please check the database connection.
        </div>
      ) : rooms.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">
          <p className="text-lg font-medium mb-2">No Registrations</p>
          <p className="text-sm">
            {searchParams.search || searchParams.status || searchParams.eventId
              ? "No registrations match your filters."
              : "No registrations have been submitted yet."}
          </p>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      Invoice
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      Room I/C
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      Event
                    </th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">
                      Package
                    </th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">
                      Pax
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">
                      Total
                    </th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">
                      Payment
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">
                      Submitted
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rooms.map((room) => (
                    <tr key={room.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/registrations/${room.id}`}
                          className="font-medium text-[var(--color-primary)] hover:underline"
                        >
                          {room.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {room.registration.roomInChargeName}
                        </div>
                        <div className="text-xs text-gray-400">
                          {room.registration.roomInChargeEmail}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {room.campEvent.name}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {room.packageType}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">
                        {room._count.occupants}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {formatCurrency(room.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${
                            STATUS_STYLES[room.paymentStatus] || ""
                          }`}
                        >
                          {room.paymentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {formatDate(room.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm">
              <p className="text-gray-500">
                Showing {(page - 1) * LIMIT + 1}–
                {Math.min(page * LIMIT, total)} of {total}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={pageUrl(page - 1)}
                    className="px-3 py-1 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={pageUrl(page + 1)}
                    className="px-3 py-1 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
