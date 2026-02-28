import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { SignOutButton } from "@/components/admin/SignOutButton";

export const metadata: Metadata = {
  title: "Admin — COSBT Camp Registration",
};

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/events", label: "Camp Events" },
  { href: "/admin/pricing", label: "Pricing" },
  { href: "/admin/registrations", label: "Registrations" },
  { href: "/admin/users", label: "User Accounts" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside
        className="w-56 text-white flex flex-col flex-shrink-0"
        style={{ backgroundColor: "var(--color-primary)" }}
      >
        {/* Logo */}
        <div className="p-5 border-b border-white/20">
          <div className="text-xs font-bold uppercase tracking-wider text-white/70 mb-1">
            Admin Panel
          </div>
          <div className="font-bold text-sm leading-tight">
            COSBT Camp Registration
          </div>
        </div>

        {/* Nav — User Accounts only visible to SUPER_ADMIN */}
        <nav className="flex-1 py-4">
          {navItems
            .filter(
              (item) =>
                item.href !== "/admin/users" ||
                session.user.role === "SUPER_ADMIN"
            )
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-5 py-3 text-sm text-white/90 hover:bg-white/10 hover:text-white transition-colors"
              >
                {item.label}
              </Link>
            ))}
        </nav>

        {/* User info + sign out */}
        <div className="p-4 border-t border-white/20">
          <div className="text-xs text-white/70 truncate">
            {session.user.email}
          </div>
          <div className="text-xs text-white/50 mb-3">
            {session.user.role.replace(/_/g, " ")}
          </div>
          {/* SignOutButton is a client component that calls signOut() directly.
              Using a plain link would trigger NextAuth's confirmation page. */}
          <SignOutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-gray-50">
        <div className="max-w-6xl mx-auto p-8">{children}</div>
      </main>
    </div>
  );
}
