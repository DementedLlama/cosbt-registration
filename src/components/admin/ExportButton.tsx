"use client";

import { useState } from "react";

export function ExportButton({ eventId }: { eventId?: string }) {
  const [downloading, setDownloading] = useState(false);

  async function handleExport() {
    setDownloading(true);
    try {
      const params = new URLSearchParams();
      if (eventId) params.set("eventId", eventId);
      const url = `/api/admin/registrations/export?${params.toString()}`;

      const res = await fetch(url);
      if (!res.ok) {
        alert("Export failed. You may not have permission.");
        return;
      }

      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download =
        res.headers
          .get("Content-Disposition")
          ?.match(/filename="(.+)"/)?.[1] ?? "registrations.xlsx";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      alert("Export failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={downloading}
      className="btn-secondary text-sm disabled:opacity-60"
    >
      {downloading ? "Exporting..." : "Export Excel"}
    </button>
  );
}
