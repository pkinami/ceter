"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto my-12 max-w-xl rounded-xl border border-red-200 bg-white p-6 text-center shadow-sm" role="alert">
      <h1 className="text-xl font-bold text-ink">This page couldn’t load</h1>
      <p className="mt-2 text-sm text-slate-600">Something went wrong while loading this page. Your saved information is unchanged.</p>
      <button type="button" onClick={reset} className="mt-5 rounded-md bg-signal px-4 py-2 font-semibold text-white">Try again</button>
    </main>
  );
}
