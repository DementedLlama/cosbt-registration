"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

interface RegistrationFiltersProps {
  events: { id: string; name: string }[];
}

export default function RegistrationFilters({
  events,
}: RegistrationFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") || "");

  function apply(overrides: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    // Reset to page 1 on filter change
    params.delete("page");
    for (const [key, value] of Object.entries(overrides)) {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }
    router.push(`/admin/registrations?${params.toString()}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    apply({ search: search.trim() });
  }

  function handleClear() {
    setSearch("");
    router.push("/admin/registrations");
  }

  const selectClass =
    "rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-colors";
  const inputClass = `${selectClass} flex-1 min-w-0`;

  const hasFilters =
    searchParams.has("search") ||
    searchParams.has("status") ||
    searchParams.has("eventId");

  return (
    <div className="card p-4 mb-6">
      <div className="flex flex-wrap items-end gap-3">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search invoice or name…"
            className={inputClass}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            type="submit"
            className="btn-primary py-2 px-4 text-sm whitespace-nowrap"
          >
            Search
          </button>
        </form>

        {/* Payment status filter */}
        <select
          className={selectClass}
          value={searchParams.get("status") || ""}
          onChange={(e) => apply({ status: e.target.value })}
        >
          <option value="">All Statuses</option>
          <option value="UNPAID">Unpaid</option>
          <option value="PAID">Paid</option>
          <option value="PARTIAL">Partial</option>
        </select>

        {/* Event filter */}
        {events.length > 1 && (
          <select
            className={selectClass}
            value={searchParams.get("eventId") || ""}
            onChange={(e) => apply({ eventId: e.target.value })}
          >
            <option value="">All Events</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
          </select>
        )}

        {/* Clear filters */}
        {hasFilters && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-gray-500 hover:text-gray-700 underline py-2"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
