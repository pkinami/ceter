"use client";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="ceter-admin-page" role="alert">
      <div className="rounded-xl border border-red-200 bg-white p-6">
        <h1 className="text-xl font-bold text-ink">Unable to load this admin page</h1>
        <p className="mt-2 text-sm text-slate-600">The request failed. Please try again; no changes are confirmed until you see a success message.</p>
        <button type="button" onClick={reset} className="ceter-admin-primary-button mt-4">Try again</button>
      </div>
    </section>
  );
}
