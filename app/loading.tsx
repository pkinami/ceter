import { SkeletonLoader } from "@/components/SkeletonLoader";

export default function Loading() {
  return (
    <main className="mx-auto min-h-[50vh] max-w-7xl px-4 py-10" aria-busy="true" aria-label="Loading page content">
      <span className="sr-only" role="status">Loading page content</span>
      <SkeletonLoader className="mb-4 h-8 w-1/3" />
      <SkeletonLoader className="mb-8 h-4 w-2/3" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => <SkeletonLoader key={index} className="h-36 rounded-lg" />)}
      </div>
    </main>
  );
}
