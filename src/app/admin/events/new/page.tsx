/**
 * Admin — Create New Camp Event
 * Thin server component wrapper for EventForm.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import EventForm from "@/components/admin/EventForm";

export default async function NewEventPage() {
    const session = await getServerSession(authOptions);

    // Only ADMIN and SUPER_ADMIN can create events
    if (!session || session.user.role === "VIEW_ONLY") {
        redirect("/admin/events");
    }

    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
                Create Camp Event
            </h1>
            <div className="card p-6">
                <EventForm mode="create" />
            </div>
        </div>
    );
}
