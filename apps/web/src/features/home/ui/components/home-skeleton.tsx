import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton"

export function HomeSkeleton() {
  return (
    <SkeletonGroup label="Carregando painel inicial" className="gap-3 lg:gap-6">
      <div className="flex items-end justify-between lg:border-b lg:border-border/70 lg:pb-4">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="hidden h-4 w-48 rounded-md lg:block" />
        </div>
        <Skeleton className="hidden h-6 w-28 rounded-md lg:block" />
      </div>

      <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-12 lg:items-start lg:gap-6">
        <div className="flex flex-col gap-3.5 lg:col-span-7 lg:gap-3">
          <Skeleton className="h-52 w-full rounded-2xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>

        <div className="lg:col-span-5">
          <Skeleton className="h-40 w-full rounded-2xl lg:h-44" />
        </div>

        <div className="lg:col-span-12">
          <Skeleton className="h-48 w-full rounded-2xl lg:hidden" />
          <div className="hidden rounded-2xl border border-border bg-card p-5 lg:grid lg:grid-cols-2 lg:gap-8">
            <div className="flex flex-col gap-3 border-r border-border pr-8">
              <Skeleton className="h-4 w-36 rounded-md" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
            <div className="flex flex-col gap-3">
              <Skeleton className="h-4 w-36 rounded-md" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </SkeletonGroup>
  )
}
