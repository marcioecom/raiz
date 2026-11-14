import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton"

/** Skeleton de carregamento do voucher espelhando as 2 colunas no desktop. */
export function VoucherSkeleton() {
  return (
    <SkeletonGroup
      label="Carregando voucher"
      className="gap-4 lg:grid lg:grid-cols-12 lg:items-start lg:gap-6"
    >
      <div className="flex min-w-0 flex-col gap-4 lg:col-span-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-36 rounded-md" />
          <Skeleton className="h-8 w-3/4 rounded-lg" />
          <Skeleton className="h-4 w-44 rounded-md" />
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-2xl lg:hidden" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>

      <div className="hidden lg:col-span-6 lg:block">
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    </SkeletonGroup>
  )
}
