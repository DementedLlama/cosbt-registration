import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getStats() {
  try {
    const [totalRegistrations, totalRooms, unpaidRooms, activeEvent] =
      await Promise.all([
        prisma.registration.count(),
        prisma.room.count(),
        prisma.room.count({ where: { paymentStatus: "UNPAID" } }),
        prisma.campEvent.findFirst({ where: { isActive: true } }),
      ]);
    return { totalRegistrations, totalRooms, unpaidRooms, activeEvent };
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const stats = await getStats();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Welcome back, {session?.user.name ?? session?.user.email}
        </p>
      </div>

      {/* Active event banner */}
      {stats?.activeEvent ? (
        <div
          className="rounded-lg p-4 mb-8 text-white"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          <div className="text-sm font-medium text-white/80 mb-1">
            Active Camp Event
          </div>
          <div className="font-bold text-lg">{stats.activeEvent.name}</div>
          <div className="text-sm text-white/80">
            {stats.activeEvent.startDate.toLocaleDateString("en-SG")} –{" "}
            {stats.activeEvent.endDate.toLocaleDateString("en-SG")} ·{" "}
            {stats.activeEvent.hotelName}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 mb-8 text-amber-800 text-sm">
          No active camp event. Go to{" "}
          <a href="/admin/events" className="underline font-medium">
            Camp Events
          </a>{" "}
          to create or activate one.
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Total Registrations"
          value={stats?.totalRegistrations ?? "—"}
        />
        <StatCard label="Rooms Booked" value={stats?.totalRooms ?? "—"} />
        <StatCard
          label="Unpaid Invoices"
          value={stats?.unpaidRooms ?? "—"}
          highlight={!!stats && stats.unpaidRooms > 0}
        />
      </div>

      {/* Quick links */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <a href="/admin/registrations" className="btn-secondary text-sm py-2">
            View Registrations
          </a>
          <a href="/admin/events" className="btn-secondary text-sm py-2">
            Manage Events
          </a>
          <a href="/admin/pricing" className="btn-secondary text-sm py-2">
            Set Pricing
          </a>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`card p-5 ${highlight ? "border-red-300 bg-red-50" : ""}`}
    >
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div
        className={`text-3xl font-bold ${highlight ? "text-red-700" : "text-gray-900"}`}
      >
        {value}
      </div>
    </div>
  );
}
