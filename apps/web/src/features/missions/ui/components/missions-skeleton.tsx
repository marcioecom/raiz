import { Card } from "@/components/ui/card"
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton"

/** Skeleton de carregamento para a lista de missões (coluna esquerda no desktop). */
export function MissionsListSkeleton({ includeBanner = false }: { includeBanner?: boolean }) {
  return (
    <SkeletonGroup label="Carregando missões da safra" className="gap-3">
      {includeBanner && <Skeleton className="h-32 w-full rounded-2xl lg:h-24" />}
      <Skeleton className="mt-2 h-4 w-32 rounded-md lg:mt-0" />
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-28 w-full rounded-2xl" />
    </SkeletonGroup>
  )
}

/** Skeleton de carregamento para o ranking da safra (coluna direita no desktop). */
export function LeaderboardSkeleton() {
  return (
    <SkeletonGroup label="Carregando ranking da safra" className="gap-3">
      <Card variant="surface" className="flex flex-col gap-2.5 p-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </Card>
    </SkeletonGroup>
  )
}

/** Skeleton completo da tela Missões e Safra espelhando o layout responsivo 7/5. */
export function MissionsSkeleton({ includeBanner = true }: { includeBanner?: boolean }) {
  return (
    <SkeletonGroup label="Carregando missões e ranking da safra" className="gap-6">
      {includeBanner && <Skeleton className="h-32 w-full rounded-2xl lg:h-24" />}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:items-start lg:gap-6">
        <div className="flex min-w-0 flex-col gap-3 lg:col-span-7">
          <Skeleton className="mt-2 h-4 w-32 rounded-md lg:mt-0" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>

        <div className="flex min-w-0 flex-col gap-3 lg:col-span-5">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-4 w-full rounded-md" />
          </div>
          <Card variant="surface" className="flex flex-col gap-2.5 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </Card>
        </div>
      </div>
    </SkeletonGroup>
  )
}
