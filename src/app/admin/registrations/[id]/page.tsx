export default function RegistrationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Registration Detail
      </h1>
      <div className="card p-8 text-center text-gray-500">
        <p className="text-sm">Registration ID: {params.id}</p>
        <p className="text-sm mt-2">
          Full detail view with rooms, occupants, payment status, and invoice
          actions will be built in the next phase.
        </p>
      </div>
    </div>
  );
}
