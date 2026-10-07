import { Container } from "@/components/common/container";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProductLoading() {
  return (
    <main className="py-section lg:py-section-lg">
      <Container>
        <Skeleton className="h-3 w-52" />
        <div className="mt-8 lg:grid lg:grid-cols-2 lg:gap-12">
          <Skeleton className="rounded-image aspect-4/5 w-full" />
          <div className="mt-8 space-y-4 lg:mt-0">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-full" />
            <div className="flex gap-2 pt-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="size-9 rounded-full" />
              ))}
            </div>
            <div className="grid grid-cols-6 gap-2 pt-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </Container>
    </main>
  );
}
