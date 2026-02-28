"use client";

import { signOut } from "next-auth/react";

/**
 * Client component that signs the user out via NextAuth's signOut() function.
 *
 * Using a Link or <a href="/api/auth/signout"> would trigger NextAuth's built-in
 * confirmation page (a GET request). This component instead calls signOut() directly,
 * which POSTs the CSRF-protected sign-out request and then redirects to /admin/login.
 */
export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/admin/login" })}
      className="text-xs text-white/70 hover:text-white underline"
    >
      Sign out
    </button>
  );
}
