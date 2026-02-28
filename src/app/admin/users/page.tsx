/**
 * User Account Management page — accessible to SUPER_ADMIN only.
 * Full implementation in next phase.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function UsersPage() {
  const session = await getServerSession(authOptions);

  // Only SUPER_ADMIN may manage user accounts.
  // Middleware enforces this too, but we add a server-side check for defence-in-depth.
  if (session?.user.role !== "SUPER_ADMIN") {
    redirect("/admin/dashboard");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        User Account Management
      </h1>
      <div className="card p-8 text-center text-gray-500">
        <p className="text-lg font-medium mb-2">Coming Soon</p>
        <p className="text-sm">
          Create, edit, and deactivate admin accounts here.
        </p>
      </div>
    </div>
  );
}
