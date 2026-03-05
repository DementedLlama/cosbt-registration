import Link from "next/link";

interface PageProps {
  searchParams: {
    invoice?: string;
    name?: string;
    total?: string;
  };
}

export default function ConfirmationPage({ searchParams }: PageProps) {
  const { invoice, name, total } = searchParams;

  if (!invoice) {
    return (
      <div className="max-w-xl mx-auto px-6 py-16 text-center">
        <p className="text-gray-500 mb-4">No registration found.</p>
        <Link href="/register" className="btn-primary">
          Back to Registration
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      {/* Success header */}
      <div className="text-center mb-8">
        <div
          className="inline-flex w-16 h-16 rounded-full items-center justify-center text-white text-2xl font-bold mb-4"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          ✓
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">
          Registration Received!
        </h2>
        <p className="text-gray-500 text-sm">
          A confirmation email has been sent to the email address you provided.
        </p>
      </div>

      {/* Invoice card */}
      <div className="card p-6 mb-5">
        <div className="text-center pb-4 mb-4 border-b">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
            Invoice Number
          </p>
          <p
            className="text-2xl font-bold tracking-wide"
            style={{ color: "var(--color-primary)" }}
          >
            {invoice}
          </p>
        </div>

        <dl className="text-sm divide-y">
          {name && (
            <div className="flex justify-between items-center py-2.5">
              <dt className="text-gray-500">Room In-Charge</dt>
              <dd className="font-medium">{name}</dd>
            </div>
          )}
          {total && (
            <div className="flex justify-between items-center py-2.5">
              <dt className="text-gray-500">Total Amount</dt>
              <dd className="font-bold" style={{ color: "var(--color-primary)" }}>
                S${total}
              </dd>
            </div>
          )}
          <div className="flex justify-between items-center py-2.5">
            <dt className="text-gray-500">Payment Status</dt>
            <dd className="text-amber-700 font-semibold">
              Unpaid — await instructions
            </dd>
          </div>
        </dl>
      </div>

      {/* Next steps */}
      <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-sm text-gray-600 mb-5">
        <p className="font-semibold text-gray-800 mb-2">What happens next?</p>
        <ol className="list-decimal list-inside space-y-1.5">
          <li>Check your inbox for the invoice confirmation email.</li>
          <li>
            The church office will send payment instructions separately.
          </li>
          <li>
            For changes or cancellations, contact the church office and quote
            your invoice number.
          </li>
        </ol>
      </div>

      {/* Book another room */}
      <div className="card p-4 text-center">
        <p className="text-sm text-gray-700 mb-3">
          <strong>Registering multiple rooms for your group?</strong>
          <br />
          <span className="text-gray-500">
            Each room needs a separate submission.
          </span>
        </p>
        <Link href="/register" className="btn-primary text-sm px-6 py-2">
          Register Another Room
        </Link>
      </div>

      {/* Back to home */}
      <div className="text-center mt-6">
        <Link href="/" className="text-sm underline text-gray-500 hover:text-gray-700">
          ← Return to home
        </Link>
      </div>
    </div>
  );
}
