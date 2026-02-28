import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Camp Registration — COSBT",
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Public site header */}
      <header
        className="text-white py-4 px-6 shadow-md"
        style={{ backgroundColor: "var(--color-primary)" }}
      >
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          {/* Replace with <Image src="/cosbt-logo.svg" ... /> when logo is available */}
          <div className="w-10 h-10 bg-white/20 rounded flex items-center justify-center text-xs font-bold">
            COSBT
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">
              Church of Singapore (Bukit Timah)
            </h1>
            <p className="text-sm text-white/80">Camp Hotel Registration</p>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-gray-100 border-t py-6 px-6 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Church of Singapore (Bukit Timah). All
        rights reserved.
      </footer>
    </div>
  );
}
