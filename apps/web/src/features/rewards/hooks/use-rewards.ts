import type { MyRedemptionsResult, Reward, RewardsCatalog, ServerRedemption } from "../types"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useState } from "react"

import { ApiError } from "@/api/client"
import { messageFor } from "@/api/messages"
import { homeKeys } from "@/features/home/hooks/use-home"
import { missionKeys } from "@/features/missions/hooks/use-missions"
import { profileKeys } from "@/features/profile/hooks/use-profile"
import { walletKeys } from "@/features/wallet/hooks/use-wallet"

import { fetchMyRedemptions, fetchRewards, fetchRewardsMeta, redeemReward } from "../api"
import {
  applyOptimisticRedeem,
  getRemainingSeconds,
  mergeServerAndStoredRedemptions,
  resolveVoucherStatus,
  selectCatalogActiveVoucher,
} from "../voucher"
import { voucherStore } from "../voucher-store"
import { useActiveVoucher } from "./use-active-voucher"

export const rewardKeys = {
  all: () => ["rewards"] as const,
  list: () => [...rewardKeys.all(), "list"] as const,
  meta: () => [...rewardKeys.all(), "meta"] as const,
  redemptions: () => [...rewardKeys.all(), "redemptions"] as const,
}

/** Lista o catálogo de prêmios e saldo atual via `GET /v1/rewards`. */
export function useRewards() {
  return useQuery({ queryKey: rewardKeys.list(), queryFn: fetchRewards })
}

/** Consulta os metadados para exibir selo explícito de demonstração na tela de prêmios. */
export function useRewardsMeta() {
  return useQuery({
    queryKey: rewardKeys.meta(),
    queryFn: fetchRewardsMeta,
    staleTime: 5 * 60_000,
  })
}

/** Lista os resgates do visitante via `GET /v1/me/redemptions` (com fallback em 404). */
export function useMyRedemptions(
  refetchInterval?: number | false | ((data: MyRedemptionsResult | undefined) => number | false),
) {
  return useQuery({
    queryKey: rewardKeys.redemptions(),
    queryFn: fetchMyRedemptions,
    // Permite polling condicional apenas enquanto houver voucher pendente no balcão.
    refetchInterval:
      typeof refetchInterval === "function"
        ? (query) => refetchInterval(query.state.data)
        : (refetchInterval ?? false),
  })
}

/** Executa o resgate atômico com débito otimista apenas de saldo/disponibilidade e rollback em erro. */
export function useRedeemMutation() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const mutation = useMutation<ServerRedemption, unknown, Reward, { previous?: RewardsCatalog }>({
    mutationFn: async (reward) => {
      if (!reward.id) throw new ApiError("not_found", 404)
      return redeemReward(reward.id)
    },
    onMutate: async (reward) => {
      setErrorMessage(null)
      await queryClient.cancelQueries({ queryKey: rewardKeys.list() })
      const previous = queryClient.getQueryData<RewardsCatalog>(rewardKeys.list())
      if (previous) {
        queryClient.setQueryData<RewardsCatalog>(
          rewardKeys.list(),
          applyOptimisticRedeem(previous, reward),
        )
      }
      return { previous }
    },
    onError: (error, _reward, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(rewardKeys.list(), context.previous)
      }
      setErrorMessage(messageFor(error))
    },
    onSuccess: (redemption, reward) => {
      const normalized: ServerRedemption = redemption.reward?.id
        ? redemption
        : { ...redemption, reward: { ...reward, ...redemption.reward } }
      voucherStore.set(normalized)
      void queryClient.invalidateQueries({ queryKey: rewardKeys.redemptions() })
      const targetRewardId = normalized.reward?.id ?? reward.id
      if (targetRewardId) {
        void navigate({ to: "/premios/$rewardId", params: { rewardId: targetRewardId } })
      }
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: rewardKeys.all() }),
        queryClient.invalidateQueries({ queryKey: homeKeys.all() }),
        queryClient.invalidateQueries({ queryKey: walletKeys.all() }),
        queryClient.invalidateQueries({ queryKey: profileKeys.all() }),
        queryClient.invalidateQueries({ queryKey: missionKeys.all() }),
      ]),
  })

  return {
    ...mutation,
    errorMessage,
    clearError: () => {
      setErrorMessage(null)
      mutation.reset()
    },
  }
}

/** Orquestra a tela 6A (catálogo, reidratação do banner ativo e vouchers recentes do servidor). */
export function useRewardsCatalog() {
  const rewardsQuery = useRewards()
  const metaQuery = useRewardsMeta()
  const redemptionsQuery = useMyRedemptions()
  const redeemMutation = useRedeemMutation()
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null)

  const serverItems = redemptionsQuery.data?.items ?? []
  const hasServerPending = serverItems.some((item) => resolveVoucherStatus(item) === "pending")
  const activeState = useActiveVoucher(hasServerPending)
  const mergedRedemptions = mergeServerAndStoredRedemptions(serverItems, activeState.voucher)
  const activeBannerVoucher = selectCatalogActiveVoucher(mergedRedemptions, activeState.nowMs)
  const activeBannerRemainingSeconds = activeBannerVoucher?.expires_at
    ? getRemainingSeconds(activeBannerVoucher.expires_at, activeState.nowMs)
    : 0
  const recentRedemptions =
    redemptionsQuery.data?.supported && serverItems.length > 0 ? mergedRedemptions.slice(0, 5) : []

  return {
    rewardsQuery,
    isDemoMode: metaQuery.data?.demo_mode === true,
    redeemMutation,
    selectedReward,
    openConfirm: (reward: Reward) => {
      redeemMutation.clearError()
      setSelectedReward(reward)
    },
    handleDialogOpenChange: (open: boolean) => {
      if (!open && redeemMutation.isPending) return
      if (!open) {
        redeemMutation.clearError()
        setSelectedReward(null)
      }
    },
    activeBannerVoucher,
    activeBannerRemainingSeconds,
    recentRedemptions,
    nowMs: activeState.nowMs,
  }
}
