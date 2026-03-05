"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface PricingFormProps {
  campEventId: string;
  eventName: string;
  initialData?: {
    singleAdultRate: string;
    twinAdultRate: string;
    tripleAdultRate: string;
    singleStudentRate: string;
    twinStudentRate: string;
    tripleStudentRate: string;
    childPrimaryRate: string;
    extraBedRate: string;
    preschoolRate: string;
    transportRate: string;
  };
}

const RATE_FIELDS = [
  { key: "singleAdultRate", label: "Single — Adult Rate" },
  { key: "twinAdultRate", label: "Twin — Adult Rate" },
  { key: "tripleAdultRate", label: "Triple — Adult Rate" },
  { key: "singleStudentRate", label: "Single — Student Rate" },
  { key: "twinStudentRate", label: "Twin — Student Rate" },
  { key: "tripleStudentRate", label: "Triple — Student Rate" },
  { key: "childPrimaryRate", label: "Child (Primary School, 7–12)" },
  { key: "extraBedRate", label: "Extra Bed Surcharge (CWB)" },
  { key: "preschoolRate", label: "Child (Preschool, 0–6)" },
  { key: "transportRate", label: "Coach Transport (per person)" },
] as const;

type RateKey = (typeof RATE_FIELDS)[number]["key"];

const DEFAULT_RATES: Record<RateKey, string> = {
  singleAdultRate: "",
  twinAdultRate: "",
  tripleAdultRate: "",
  singleStudentRate: "",
  twinStudentRate: "",
  tripleStudentRate: "",
  childPrimaryRate: "",
  extraBedRate: "",
  preschoolRate: "0.00",
  transportRate: "",
};

export default function PricingForm({
  campEventId,
  eventName,
  initialData,
}: PricingFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [rates, setRates] = useState<Record<RateKey, string>>(
    initialData ?? DEFAULT_RATES
  );

  function updateRate(key: RateKey, value: string) {
    setRates((prev) => ({ ...prev, [key]: value }));
    setSuccess(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Client-side: check all fields are filled
    for (const field of RATE_FIELDS) {
      const val = rates[field.key].trim();
      if (!val) {
        setError(`${field.label} is required.`);
        return;
      }
      if (!/^\d+(\.\d{1,2})?$/.test(val)) {
        setError(`${field.label} must be a valid amount (e.g. 350.00).`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campEventId, ...rates }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save pricing");
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

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-colors";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-green-800 text-sm">
          Pricing for <strong>{eventName}</strong> saved successfully.
        </div>
      )}

      {/* Adult Rates by Package Type */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
          Adult Rates (per person)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {RATE_FIELDS.filter((f) => f.key.includes("Adult")).map((field) => (
            <div key={field.key}>
              <label htmlFor={field.key} className={labelClass}>
                {field.label} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  $
                </span>
                <input
                  id={field.key}
                  type="text"
                  inputMode="decimal"
                  className={`${inputClass} pl-7`}
                  placeholder="0.00"
                  value={rates[field.key]}
                  onChange={(e) => updateRate(field.key, e.target.value)}
                  required
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Student Rates */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
          Student Rates (per person)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {RATE_FIELDS.filter((f) => f.key.includes("Student")).map((field) => (
            <div key={field.key}>
              <label htmlFor={field.key} className={labelClass}>
                {field.label} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  $
                </span>
                <input
                  id={field.key}
                  type="text"
                  inputMode="decimal"
                  className={`${inputClass} pl-7`}
                  placeholder="0.00"
                  value={rates[field.key]}
                  onChange={(e) => updateRate(field.key, e.target.value)}
                  required
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Child / Add-on Rates */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
          Child &amp; Add-on Rates
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {RATE_FIELDS.filter(
            (f) =>
              !f.key.includes("Adult") &&
              !f.key.includes("Student") &&
              !f.key.includes("transport")
          ).map((field) => (
            <div key={field.key}>
              <label htmlFor={field.key} className={labelClass}>
                {field.label} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  $
                </span>
                <input
                  id={field.key}
                  type="text"
                  inputMode="decimal"
                  className={`${inputClass} pl-7`}
                  placeholder="0.00"
                  value={rates[field.key]}
                  onChange={(e) => updateRate(field.key, e.target.value)}
                  required
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transport Rate */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">
          Transport
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {RATE_FIELDS.filter((f) => f.key.includes("transport")).map(
            (field) => (
              <div key={field.key}>
                <label htmlFor={field.key} className={labelClass}>
                  {field.label} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    $
                  </span>
                  <input
                    id={field.key}
                    type="text"
                    inputMode="decimal"
                    className={`${inputClass} pl-7`}
                    placeholder="0.00"
                    value={rates[field.key]}
                    onChange={(e) => updateRate(field.key, e.target.value)}
                    required
                  />
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary py-2.5 px-6 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Saving…" : "Save Pricing"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/pricing")}
          className="btn-secondary py-2.5 px-6 text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
