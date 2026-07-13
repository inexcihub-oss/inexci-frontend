import { cn } from "@/lib/utils";
import PageContainer from "@/components/PageContainer";

type FacebookSkeletonVariant = "list" | "details";

interface FacebookSkeletonProps {
  variant?: FacebookSkeletonVariant;
  className?: string;
}

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn("fb-skeleton rounded-xl", className)}
      aria-hidden="true"
    />
  );
}

function ListCardSkeleton() {
  return (
    <div className="rounded-2xl border border-neutral-100 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <SkeletonBlock className="h-8 w-8 rounded-full" />
          <div className="space-y-2">
            <SkeletonBlock className="h-2.5 w-28 sm:w-32" />
            <SkeletonBlock className="h-2.5 w-20 sm:w-24" />
          </div>
        </div>
        <SkeletonBlock className="h-6 w-14 rounded-full" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <SkeletonBlock className="h-2.5 w-full" />
        <SkeletonBlock className="h-2.5 w-full" />
        <SkeletonBlock className="h-2.5 w-full" />
      </div>
    </div>
  );
}

function DetailsSkeleton() {
  return (
    <div className="flex-1 overflow-hidden px-3 sm:px-4 lg:px-4 py-4">
      <div className="h-full grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_22rem] gap-4">
        <div className="rounded-2xl border border-neutral-100 bg-white p-4 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <SkeletonBlock className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <SkeletonBlock className="h-3 w-40" />
                <SkeletonBlock className="h-3 w-28" />
              </div>
            </div>
            <SkeletonBlock className="h-8 w-24 rounded-xl" />
          </div>

          <div className="flex items-center gap-2 overflow-hidden">
            {Array.from({ length: 5 }).map((_, idx) => (
              <SkeletonBlock key={idx} className="h-9 w-24 rounded-lg" />
            ))}
          </div>

          <div className="space-y-3">
            <SkeletonBlock className="h-24 w-full rounded-2xl" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SkeletonBlock className="h-24 w-full rounded-2xl" />
              <SkeletonBlock className="h-24 w-full rounded-2xl" />
            </div>
            <SkeletonBlock className="h-56 w-full rounded-2xl" />
          </div>
        </div>

        <aside className="hidden lg:flex lg:flex-col rounded-2xl border border-neutral-100 bg-white overflow-hidden">
          <div className="h-13 border-b border-neutral-100 px-3 flex items-center gap-2">
            <SkeletonBlock className="h-8 flex-1 rounded-lg" />
          </div>
          <div className="p-3 space-y-2.5">
            {Array.from({ length: 8 }).map((_, idx) => (
              <SkeletonBlock key={idx} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <>
      <div className="flex-none flex items-center gap-2 px-4 py-3 lg:py-6 border-b border-neutral-100">
        <SkeletonBlock className="h-6 w-52" />
      </div>

      <div className="flex-none border-b border-neutral-100 px-3 lg:px-4 py-3 space-y-3 lg:space-y-0 lg:flex lg:items-center lg:justify-between lg:gap-4">
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-8 w-24 rounded-lg" />
          <SkeletonBlock className="h-8 w-20 rounded-lg" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SkeletonBlock className="h-9 w-full sm:w-72" />
          <SkeletonBlock className="h-9 w-24 rounded-xl" />
          <SkeletonBlock className="h-9 w-24 rounded-xl" />
          <SkeletonBlock className="h-9 w-28 rounded-xl" />
          <SkeletonBlock className="h-9 w-32 rounded-xl" />
          <SkeletonBlock className="h-9 w-36 rounded-xl" />
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-3 sm:px-4 lg:px-4 py-4">
        <div className="h-full overflow-x-auto">
          <div className="min-w-[980px] h-full grid grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, col) => (
              <div
                key={col}
                className="h-full rounded-2xl border border-neutral-100 bg-neutral-50 p-2.5 space-y-2.5"
              >
                <SkeletonBlock className="h-5 w-24" />
                {Array.from({ length: 3 }).map((__, card) => (
                  <ListCardSkeleton key={`${col}-${card}`} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export default function FacebookSkeleton({
  variant = "list",
  className,
}: FacebookSkeletonProps) {
  return (
    <PageContainer className={cn(className)}>
      {variant === "details" ? <DetailsSkeleton /> : <ListSkeleton />}
      <span className="sr-only">Carregando conteúdo...</span>
    </PageContainer>
  );
}
