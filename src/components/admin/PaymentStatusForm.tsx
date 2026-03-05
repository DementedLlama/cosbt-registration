"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PaymentStatusFormProps {
  roomId: string;
  currentStatus: string;
  currentNotes: string;
}

export default function PaymentStatusForm({
  roomId,
  currentStatus,
  currentNotes,
}: PaymentStatusFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [notes, setNotes] = useState(currentNotes);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const hasChanges = status !== currentStatus || notes !== currentNotes;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hasChanges) return;
    setError(null);
    setSuccess(false);
    setSubmitting(true);

    try {
      const body: Record<string, string> = {};
      if (status !== currentStatus) body.paymentStatus = status;
      if (notes !== currentNotes) body.adminNotes = notes;

      const res = await fetch(`/api/admin/registrations/${roomId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update");
      }

      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setSubmitting(false);
    }
  }

  const selectClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-colors";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-red-800 text-xs">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-green-800 text-xs">
          Payment updated successfully.
        </div>
      )}

      <div>
        <label
          htmlFor="payment-status"
          className="block text-sm font-medium text-gray-700 mb-1.5"
        >
          Payment Status
        </label>
        <select
          id="payment-status"
          className={selectClass}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setSuccess(false);
          }}
        >
          <option value="UNPAID">Unpaid</option>
          <option value="PAID">Paid</option>
          <option value="PARTIAL">Partial</option>
        </select>
      </div>

      <div>
        <label
          htmlFor="admin-notes"
          className="block text-sm font-medium text-gray-700 mb-1.5"
        >
          Admin Notes{" "}
          <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="admin-notes"
          rows={3}
          className={selectClass}
          placeholder="Internal notes about payment, follow-up, etc."
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setSuccess(false);
          }}
        />
      </div>

      <button
        type="submit"
        disabled={submitting || !hasChanges}
        className="btn-primary py-2 px-4 text-sm w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "Saving…" : "Update Payment"}
      </button>
    </form>
  );
}
