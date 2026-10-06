import { Container } from "@/components/common/container";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading UI for the collection page.
 *
 * Next.js shows this automatically while the server component above is
 * rendering. The skeleton mirrors the real layout — a spinner in the middle of
 * an empty page causes a visible jump when content lands.
 */
export default function CollectionLoading() {
  return (
    <main className="py-section lg:py-section-lg">
      <Container>
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-6 h-10 w-64" />
        <Skeleton className="mt-3 h-4 w-96" />

        <div className="mt-10 lg:grid lg:grid-cols-[16rem_1fr] lg:gap-10">
          <div className="hidden space-y-4 lg:block">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-44" />
            </div>
            <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <li key={i}>
                  <Skeleton className="rounded-image aspect-4/5 w-full" />
                  <Skeleton className="mt-3 h-4 w-3/4" />
                  <Skeleton className="mt-2 h-3 w-1/2" />
                  <Skeleton className="mt-2 h-4 w-1/3" />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </main>
  );
}
