/**
 * User Account Management page — accessible to SUPER_ADMIN only.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import UserManagement from "@/components/admin/UserManagement";

export default async function UsersPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "SUPER_ADMIN") {
    redirect("/admin/dashboard");
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  // Serialize dates for client component
  const serialized = users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        User Account Management
      </h1>
      <UserManagement
        initialUsers={serialized}
        currentUserId={session.user.id}
      />
    </div>
  );
}
