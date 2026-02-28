export default function EventDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Edit Camp Event
      </h1>
      <div className="card p-8 text-center text-gray-500">
        <p className="text-sm">Event ID: {params.id}</p>
        <p className="text-sm mt-2">Implementation coming in next phase.</p>
      </div>
    </div>
  );
}
