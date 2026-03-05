"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface EventFormProps {
    mode: "create" | "edit";
    eventId?: string;
    initialData?: {
        name: string;
        venue: string;
        hotelName: string;
        startDate: string;
        endDate: string;
        registrationDeadline: string;
        description: string;
        isActive: boolean;
    };
}

export default function EventForm({ mode, eventId, initialData }: EventFormProps) {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [name, setName] = useState(initialData?.name ?? "");
    const [venue, setVenue] = useState(initialData?.venue ?? "");
    const [hotelName, setHotelName] = useState(initialData?.hotelName ?? "");
    const [startDate, setStartDate] = useState(initialData?.startDate ?? "");
    const [endDate, setEndDate] = useState(initialData?.endDate ?? "");
    const [registrationDeadline, setRegistrationDeadline] = useState(
        initialData?.registrationDeadline ?? ""
    );
    const [description, setDescription] = useState(initialData?.description ?? "");
    const [isActive, setIsActive] = useState(initialData?.isActive ?? false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        // Client-side validation
        if (!name.trim() || !venue.trim() || !hotelName.trim()) {
            setError("Name, venue, and hotel name are required.");
            return;
        }
        if (!startDate || !endDate || !registrationDeadline) {
            setError("All date fields are required.");
            return;
        }
        if (new Date(endDate) <= new Date(startDate)) {
            setError("End date must be after start date.");
            return;
        }
        if (new Date(registrationDeadline) > new Date(endDate)) {
            setError("Registration deadline must be on or before end date.");
            return;
        }

        setSubmitting(true);
        try {
            const url =
                mode === "create"
                    ? "/api/admin/events"
                    : `/api/admin/events/${eventId}`;
            const method = mode === "create" ? "POST" : "PUT";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name.trim(),
                    venue: venue.trim(),
                    hotelName: hotelName.trim(),
                    startDate,
                    endDate,
                    registrationDeadline,
                    description: description.trim() || undefined,
                    isActive,
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(
                    data.error || `Failed to ${mode === "create" ? "create" : "update"} event`
                );
            }

            router.push("/admin/events");
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
        } finally {
            setSubmitting(false);
        }
    }

    const inputClass =
        "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] outline-none transition-colors";
    const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800 text-sm">
                    {error}
                </div>
            )}

            {/* Event name */}
            <div>
                <label htmlFor="event-name" className={labelClass}>
                    Event Name <span className="text-red-500">*</span>
                </label>
                <input
                    id="event-name"
                    type="text"
                    className={inputClass}
                    placeholder="e.g. COSBT Church Camp 2026"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
            </div>

            {/* Venue + Hotel (side-by-side) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="event-venue" className={labelClass}>
                        Venue <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="event-venue"
                        type="text"
                        className={inputClass}
                        placeholder="e.g. Batam, Indonesia"
                        value={venue}
                        onChange={(e) => setVenue(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label htmlFor="event-hotel" className={labelClass}>
                        Hotel Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="event-hotel"
                        type="text"
                        className={inputClass}
                        placeholder="e.g. Harris Resort Waterfront"
                        value={hotelName}
                        onChange={(e) => setHotelName(e.target.value)}
                        required
                    />
                </div>
            </div>

            {/* Dates (three fields, responsive grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                    <label htmlFor="event-start" className={labelClass}>
                        Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="event-start"
                        type="date"
                        className={inputClass}
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label htmlFor="event-end" className={labelClass}>
                        End Date <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="event-end"
                        type="date"
                        className={inputClass}
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label htmlFor="event-deadline" className={labelClass}>
                        Registration Deadline <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="event-deadline"
                        type="date"
                        className={inputClass}
                        value={registrationDeadline}
                        onChange={(e) => setRegistrationDeadline(e.target.value)}
                        required
                    />
                </div>
            </div>

            {/* Description */}
            <div>
                <label htmlFor="event-description" className={labelClass}>
                    Description <span className="text-gray-400">(optional)</span>
                </label>
                <textarea
                    id="event-description"
                    rows={3}
                    className={inputClass}
                    placeholder="Any additional details about the event..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-3">
                <input
                    id="event-active"
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                />
                <label htmlFor="event-active" className="text-sm text-gray-700">
                    Set as active event
                    <span className="text-gray-400 ml-1">(only one event can be active at a time)</span>
                </label>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
                <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary py-2.5 px-6 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {submitting
                        ? mode === "create"
                            ? "Creating…"
                            : "Saving…"
                        : mode === "create"
                            ? "Create Event"
                            : "Save Changes"}
                </button>
                <button
                    type="button"
                    onClick={() => router.push("/admin/events")}
                    className="btn-secondary py-2.5 px-6 text-sm"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}
