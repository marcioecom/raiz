import type { Redemption, Reward, RewardsCatalog } from "../voucher"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useState } from "react"

import { ApiError } from "@/api/client"
import { messageFor } from "@/api/messages"
import { homeKeys } from "@/features/home/hooks/use-home"
import { missionKeys } from "@/features/missions/hooks/use-missions"
import { profileKeys } from "@/features/profile/hooks/use-profile"
import { walletKeys } from "@/features/wallet/hooks/use-wallet"

import { fetchRewards, fetchRewardsMeta, redeemReward } from "../api"
import { applyOptimisticRedeem } from "../voucher"
import { voucherStore } from "../voucher-store"
import { useActiveVoucher } from "./use-voucher-detail"

export const rewardKeys = {
  all: () => ["rewards"] as const,
  list: () => [...rewardKeys.all(), "list"] as const,
  meta: () => [...rewardKeys.all(), "meta"] as const,
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

/** Executa o resgate atômico com débito otimista apenas de saldo/disponibilidade e rollback em erro. */
export function useRedeemMutation() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const mutation = useMutation<Redemption, unknown, Reward, { previous?: RewardsCatalog }>({
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
      const normalized: Redemption = redemption.reward?.id
        ? redemption
        : { ...redemption, reward: { ...reward, ...redemption.reward } }
      voucherStore.set(normalized)
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

/** Orquestra a tela 6A (catálogo, banner de voucher ativo e diálogo de confirmação). */
export function useRewardsCatalog() {
  const rewardsQuery = useRewards()
  const metaQuery = useRewardsMeta()
  const redeemMutation = useRedeemMutation()
  const activeState = useActiveVoucher()
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null)

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
    activeBannerVoucher:
      activeState.voucher && !activeState.expired && activeState.voucher.reward?.id
        ? activeState.voucher
        : null,
    activeBannerRemainingSeconds: activeState.remainingSeconds,
  }
}
