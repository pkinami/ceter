import { SkeletonLoader } from "@/components/SkeletonLoader";

export default function AdminLoading() {
  return (
    <section className="ceter-admin-page" aria-busy="true" aria-label="Loading admin page">
      <span className="sr-only" role="status">Loading admin records</span>
      <SkeletonLoader className="mb-3 h-8 w-1/3" />
      <SkeletonLoader className="mb-6 h-4 w-1/2" />
      <SkeletonLoader className="mb-5 h-24 rounded-xl" />
      <SkeletonLoader className="mb-3 h-12 rounded-lg" />
      {Array.from({ length: 7 }, (_, index) => <SkeletonLoader key={index} className="mb-2 h-11 rounded-md" />)}
    </section>
  );
}
