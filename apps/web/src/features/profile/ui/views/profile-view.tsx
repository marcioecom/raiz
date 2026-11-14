import { WifiOff } from "lucide-react"

import { messageFor } from "@/api/messages"
import { DemoBadge } from "@/components/demo-badge"
import { ErrorState } from "@/components/error-state"
import { RaizLogo } from "@/components/raiz-logo"
import { Button } from "@/components/ui/button"
import { Skeleton, SkeletonGroup } from "@/components/ui/skeleton"

import { useProfile } from "../../hooks/use-profile"
import { buildProfileOverview } from "../../tier"
import { LgpdActionsCard } from "../components/lgpd-actions-card"
import { ShareClubCard } from "../components/share-club-card"
import { TierSummaryCard } from "../components/tier-summary-card"

function ProfileSkeleton() {
  return (
    <SkeletonGroup label="Carregando perfil" className="gap-4">
      <Skeleton className="h-64 w-full rounded-2xl" />
      <Skeleton className="h-44 w-full rounded-2xl" />
      <div className="flex flex-col gap-3 pt-1">
        <Skeleton className="h-4 w-36 rounded-md" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </SkeletonGroup>
  )
}

/** Tela 7: Perfil, progressão de nível sem campos fictícios e controles LGPD. */
export function ProfileView() {
  const profile = useProfile()
  const { meQuery } = profile

  const exportErrorMessage = profile.exportError ? messageFor(profile.exportError) : null
  const deleteErrorMessage = profile.deleteError ? messageFor(profile.deleteError) : null

  return (
    <div className="flex flex-col gap-4 pb-2">
      <header className="flex items-center justify-between gap-2">
        <RaizLogo />
        {profile.isDemoMode && <DemoBadge />}
      </header>

      <h1 className="text-2xl font-bold leading-[30px] tracking-[-0.015em] text-ink">Perfil</h1>

      {meQuery.isPending && <ProfileSkeleton />}

      {meQuery.isError && !meQuery.data && (
        <ErrorState
          message={messageFor(meQuery.error)}
          onRetry={() => {
            void meQuery.refetch()
          }}
        />
      )}

      {meQuery.data && (
        <>
          {meQuery.isError && (
            <div
              role="status"
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-warning-soft px-3.5 py-2.5"
            >
              <div className="flex items-center gap-2 text-[13px] font-medium leading-[18px] text-ink">
                <WifiOff
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-warning"
                  strokeWidth={1.75}
                />
                <span>Sem conexão. Mostrando o último perfil salvo.</span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  void meQuery.refetch()
                }}
              >
                Tentar de novo
              </Button>
            </div>
          )}

          <TierSummaryCard overview={buildProfileOverview(meQuery.data)} />

          <ShareClubCard
            clubUrl={profile.clubUrl}
            feedback={profile.shareFeedback}
            onCopy={profile.copyClubLink}
            onShare={profile.shareClubLink}
          />

          <LgpdActionsCard
            isExporting={profile.isExporting}
            exportFeedback={profile.exportFeedback}
            exportErrorMessage={exportErrorMessage}
            onExport={profile.exportMyData}
            isDeleteDialogOpen={profile.isDeleteDialogOpen}
            isDeleting={profile.isDeleting}
            deleteErrorMessage={deleteErrorMessage}
            onDeleteDialogOpenChange={profile.setDeleteDialogOpen}
            onConfirmDelete={profile.confirmDeleteAccount}
          />

          <footer className="pt-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted">
              RAIZ · CAPIM DOURADO SHOPPING
            </p>
          </footer>
        </>
      )}
    </div>
  )
}
