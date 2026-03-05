"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ToggleActiveButtonProps {
    eventId: string;
    currentName: string;
    isActive: boolean;
}

export default function ToggleActiveButton({
    eventId,
    currentName,
    isActive,
}: ToggleActiveButtonProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    async function handleToggle() {
        const action = isActive ? "deactivate" : "activate";
        const confirmed = window.confirm(
            isActive
                ? `Deactivate "${currentName}"? Public registration will be disabled until another event is activated.`
                : `Activate "${currentName}"? This will deactivate any other active event.`
        );
        if (!confirmed) return;

        setLoading(true);
        try {
            // First fetch the full event so we can send a valid PUT body
            const getRes = await fetch(`/api/admin/events/${eventId}`);
            if (!getRes.ok) throw new Error("Failed to fetch event");
            const { data: event } = await getRes.json();

            const res = await fetch(`/api/admin/events/${eventId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: event.name,
                    venue: event.venue,
                    hotelName: event.hotelName,
                    startDate: event.startDate.split("T")[0],
                    endDate: event.endDate.split("T")[0],
                    registrationDeadline: event.registrationDeadline.split("T")[0],
                    description: event.description || undefined,
                    isActive: !isActive,
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `Failed to ${action} event`);
            }

            router.refresh();
        } catch (err) {
            alert(
                err instanceof Error ? err.message : `Failed to ${action} event`
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <button
            onClick={handleToggle}
            disabled={loading}
            className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors disabled:opacity-50 ${isActive
                    ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                    : "bg-green-100 text-green-700 hover:bg-green-200"
                }`}
        >
            {loading ? "…" : isActive ? "Deactivate" : "Activate"}
        </button>
    );
}
