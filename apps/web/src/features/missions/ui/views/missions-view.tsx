import { ListChecks, WifiOff } from "lucide-react"

import { messageFor } from "@/api/messages"
import { DemoBadge } from "@/components/demo-badge"
import { EmptyState } from "@/components/empty-state"
import { ErrorState } from "@/components/error-state"
import { MobileBrandHeader } from "@/components/mobile-brand-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

import { useLeaderboard, useMissions, useMissionsMeta } from "../../hooks/use-missions"
import { LeaderboardList } from "../components/leaderboard-list"
import { MissionCard } from "../components/mission-card"
import {
  LeaderboardSkeleton,
  MissionsListSkeleton,
  MissionsSkeleton,
} from "../components/missions-skeleton"
import { SeasonBanner } from "../components/season-banner"

export function MissionsView() {
  const missionsQuery = useMissions()
  const leaderboardQuery = useLeaderboard(10)
  const metaQuery = useMissionsMeta()
  const isDemoMode = metaQuery.data?.demo_mode === true

  const handleRetryAll = () => {
    void missionsQuery.refetch()
    void leaderboardQuery.refetch()
  }

  const season = missionsQuery.data?.season ?? leaderboardQuery.data?.season
  const missions = missionsQuery.data?.missions ?? []
  const activeMissions = missions.filter((mission) => !mission.completed_at)
  const completedMissions = missions.filter((mission) => Boolean(mission.completed_at))

  const bothPending = missionsQuery.isPending && leaderboardQuery.isPending
  const bothFailedWithoutData =
    missionsQuery.isError &&
    !missionsQuery.data &&
    leaderboardQuery.isError &&
    !leaderboardQuery.data

  const hasCachedError =
    (missionsQuery.isError && Boolean(missionsQuery.data)) ||
    (leaderboardQuery.isError && Boolean(leaderboardQuery.data))

  return (
    <div className="flex flex-col gap-6">
      <MobileBrandHeader demo={isDemoMode} className="min-h-11 border-b border-border/70 pb-3" />

      <header className="flex items-center justify-between gap-4 lg:border-b lg:border-border/70 lg:pb-4">
        <h1 className="text-2xl font-bold leading-[30px] tracking-[-0.015em] text-ink">
          Missões e Safra
        </h1>
        {isDemoMode && (
          <div className="hidden lg:block">
            <DemoBadge />
          </div>
        )}
      </header>

      {hasCachedError && (
        <Card variant="sand" className="flex flex-wrap items-center justify-between gap-3 p-3">
          <div className="flex min-w-0 items-center gap-2 text-[13px] font-medium leading-[18px] text-ink">
            <WifiOff
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-warning"
              strokeWidth={1.75}
            />
            <span>Sem conexão. Mostrando o que já foi salvo.</span>
          </div>
          <Button variant="secondary" size="sm" onClick={handleRetryAll}>
            Tentar de novo
          </Button>
        </Card>
      )}

      {bothFailedWithoutData ? (
        <ErrorState message={messageFor(missionsQuery.error)} onRetry={handleRetryAll} />
      ) : bothPending ? (
        <MissionsSkeleton includeBanner={!season} />
      ) : (
        <>
          {season && <SeasonBanner season={season} />}

          <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:items-start lg:gap-6">
            <div className="flex min-w-0 flex-col gap-6 lg:col-span-7">
              {missionsQuery.isPending ? (
                <MissionsListSkeleton />
              ) : missionsQuery.isError && !missionsQuery.data ? (
                <ErrorState
                  message={messageFor(missionsQuery.error)}
                  onRetry={() => void missionsQuery.refetch()}
                />
              ) : missions.length === 0 ? (
                <EmptyState
                  icon={ListChecks}
                  title="Nenhuma missão ativa nesta safra"
                  description="As missões do ciclo aparecem aqui assim que a safra abrir. Enquanto isso, seus cupons já somam sementes."
                />
              ) : (
                <>
                  {activeMissions.length > 0 && (
                    <section className="flex flex-col gap-3">
                      <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted">
                        Em andamento
                      </h2>
                      <ul role="list" className="flex list-none flex-col gap-3">
                        {activeMissions.map((mission, index) => (
                          <li key={mission.id ?? mission.code ?? index} className="min-w-0">
                            <MissionCard mission={mission} />
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {completedMissions.length > 0 && (
                    <section className="flex flex-col gap-3">
                      <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted">
                        Concluídas
                      </h2>
                      <ul role="list" className="flex list-none flex-col gap-3">
                        {completedMissions.map((mission, index) => (
                          <li key={mission.id ?? mission.code ?? index} className="min-w-0">
                            <MissionCard mission={mission} />
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </>
              )}
            </div>

            <section className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-6 lg:col-span-5">
              <div className="flex flex-col gap-1">
                <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted">
                  Ranking da Safra
                </h2>
                <p className="text-[13px] leading-[18px] text-ink-muted">
                  Os 10 primeiros colocados da safra recebem experiências no Capim Dourado (camarote
                  e valet).
                </p>
              </div>

              {leaderboardQuery.isPending ? (
                <LeaderboardSkeleton />
              ) : leaderboardQuery.isError && !leaderboardQuery.data ? (
                <ErrorState
                  message={messageFor(leaderboardQuery.error)}
                  onRetry={() => void leaderboardQuery.refetch()}
                />
              ) : (
                <LeaderboardList
                  entries={leaderboardQuery.data?.entries ?? []}
                  me={leaderboardQuery.data?.me ?? null}
                />
              )}
            </section>
          </div>
        </>
      )}
    </div>
  )
}
