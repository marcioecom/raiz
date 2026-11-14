import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton"

/** Skeleton de carregamento do perfil espelhando o layout responsivo 7/5. */
export function ProfileSkeleton() {
  return (
    <SkeletonGroup label="Carregando perfil" className="gap-4">
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-12 lg:items-start lg:gap-6">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-7">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
        </div>

        <div className="flex min-w-0 flex-col gap-3 pt-1 lg:col-span-5 lg:rounded-2xl lg:border lg:border-border lg:bg-card lg:p-5 lg:pt-5">
          <Skeleton className="h-4 w-36 rounded-md" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    </SkeletonGroup>
  )
}
