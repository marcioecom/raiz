import { WifiOff } from "lucide-react"

import { messageFor } from "@/api/messages"
import { DemoBadge } from "@/components/demo-badge"
import { ErrorState } from "@/components/error-state"
import { MobileBrandHeader } from "@/components/mobile-brand-header"
import { Button } from "@/components/ui/button"

import { useProfile } from "../../hooks/use-profile"
import { buildProfileOverview } from "../../tier"
import { LgpdActionsCard } from "../components/lgpd-actions-card"
import { ProfileSkeleton } from "../components/profile-skeleton"
import { ShareClubCard } from "../components/share-club-card"
import { TierSummaryCard } from "../components/tier-summary-card"

/** Tela 7: Perfil, progressão de nível sem campos fictícios e controles LGPD. */
export function ProfileView() {
  const profile = useProfile()
  const { meQuery } = profile

  const exportErrorMessage = profile.exportError ? messageFor(profile.exportError) : null
  const deleteErrorMessage = profile.deleteError ? messageFor(profile.deleteError) : null

  return (
    <div className="flex flex-col gap-4 pb-2">
      <MobileBrandHeader demo={profile.isDemoMode} />

      <header className="flex items-center justify-between gap-4 lg:border-b lg:border-border/70 lg:pb-4">
        <h1 className="text-2xl font-bold leading-[30px] tracking-[-0.015em] text-ink">Perfil</h1>
        {profile.isDemoMode && (
          <div className="hidden lg:block">
            <DemoBadge />
          </div>
        )}
      </header>

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
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-warning-soft px-3.5 py-2.5">
              <p
                role="status"
                className="flex min-w-0 items-center gap-2 text-[13px] font-medium leading-[18px] text-ink"
              >
                <WifiOff
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-warning"
                  strokeWidth={1.75}
                />
                <span>Sem conexão. Mostrando o último perfil salvo.</span>
              </p>
              <Button
                type="button"
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

          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-12 lg:items-start lg:gap-6">
            <div className="flex min-w-0 flex-col gap-4 lg:col-span-7">
              <TierSummaryCard overview={buildProfileOverview(meQuery.data)} />

              <ShareClubCard
                clubUrl={profile.clubUrl}
                referralCode={profile.referralCode}
                feedback={profile.shareFeedback}
                onCopy={profile.copyClubLink}
                onShare={profile.shareClubLink}
              />
            </div>

            <div className="min-w-0 lg:col-span-5">
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
            </div>
          </div>

          <footer className="pt-3 text-center lg:hidden">
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted">
              RAIZ · CAPIM DOURADO SHOPPING
            </p>
          </footer>
        </>
      )}
    </div>
  )
}
