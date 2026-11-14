import { Card } from "@/components/ui/card"
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export function WalletHeroSkeleton({ className }: { className?: string }) {
  return (
    <SkeletonGroup label="Carregando saldo e ritmo" className={cn("gap-4", className)}>
      <Skeleton className="h-56 w-full rounded-2xl" />
      <Skeleton className="h-44 w-full rounded-2xl" />
    </SkeletonGroup>
  )
}

export function LedgerSkeleton({ className }: { className?: string }) {
  return (
    <SkeletonGroup label="Carregando extrato de sementes" className={cn("gap-2.5", className)}>
      <Skeleton className="h-4 w-36 rounded-md" />
      <Card variant="surface" className="flex flex-col gap-3 p-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </Card>
    </SkeletonGroup>
  )
}

/** Skeleton combinado da carteira espelhando as 2 colunas em desktop (>= 1024px). */
export function WalletSkeleton() {
  return (
    <SkeletonGroup
      label="Carregando carteira"
      className="gap-4 lg:grid lg:grid-cols-12 lg:items-start lg:gap-6"
    >
      <div className="flex min-w-0 flex-col gap-4 lg:col-span-5">
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-44 w-full rounded-2xl" />
      </div>

      <div className="flex min-w-0 flex-col gap-2.5 lg:col-span-7">
        <Skeleton className="mt-1 h-4 w-36 rounded-md lg:mt-0" />
        <Card variant="surface" className="flex flex-col gap-3 p-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </Card>
      </div>
    </SkeletonGroup>
  )
}
