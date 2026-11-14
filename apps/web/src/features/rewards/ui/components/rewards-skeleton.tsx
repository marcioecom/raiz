import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton"

/** Skeleton de carregamento do catálogo de prêmios espelhando o grid responsivo. */
export function RewardsSkeleton() {
  return (
    <SkeletonGroup
      label="Carregando catálogo de prêmios"
      className="gap-3.5 lg:grid lg:grid-cols-2 lg:gap-x-4 lg:gap-y-5 xl:grid-cols-3"
    >
      <Skeleton className="h-44 w-full rounded-2xl" />
      <Skeleton className="h-44 w-full rounded-2xl" />
      <Skeleton className="h-44 w-full rounded-2xl" />
    </SkeletonGroup>
  )
}
