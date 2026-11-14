import type { BaseSyntheticEvent } from "react"
import type { ReceiptResult } from "../api"
import type { ScanSource } from "../queue"
import type { CameraStatus, ManualKeyFormValues, ScanMode } from "../types"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useCallback, useRef, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import { messageFor, translateApiCode } from "@/api/messages"
import { homeKeys } from "@/features/home/hooks/use-home"
import { missionKeys } from "@/features/missions/hooks/use-missions"
import { profileKeys } from "@/features/profile/hooks/use-profile"
import { rewardKeys } from "@/features/rewards/hooks/use-rewards"
import { walletKeys } from "@/features/wallet/hooks/use-wallet"

import {
  chunkAccessKey,
  extractAccessKeyDigits,
  formatAccessKeyGroups,
  validateAccessKey,
} from "../access-key"
import { submitReceipt } from "../api"
import { createIdempotencyKey } from "../queue"
import { useQrCamera } from "./use-qr-camera"
import { isNetworkFailure, useReceiptQueue } from "./use-receipt-queue"

export type { CameraStatus, ManualKeyFormValues, ScanMode }
export type { QueueNotice } from "./use-receipt-queue"

const manualKeySchema = z.object({
  accessKey: z.string().superRefine((value, ctx) => {
    const res = validateAccessKey(value)
    if (!res.ok) ctx.addIssue({ code: z.ZodIssueCode.custom, message: translateApiCode(res.code) })
  }),
})

/** Orquestra câmera QR, digitação dos 44 dígitos, fila offline e envio idempotente. */
export function useScan() {
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<ScanMode>("camera")
  const [helpOpen, setHelpOpen] = useState(false)
  const [successResult, setSuccessResult] = useState<ReceiptResult | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const submitLockRef = useRef(false)

  const manualForm = useForm<ManualKeyFormValues>({
    resolver: zodResolver(manualKeySchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: { accessKey: "" },
  })
  const invalidateAll = useCallback(
    () =>
      Promise.all(
        [
          homeKeys.all(),
          walletKeys.all(),
          missionKeys.all(),
          profileKeys.all(),
          rewardKeys.all(),
        ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      ),
    [queryClient],
  )
  const { mutateAsync, isPending: isSubmitting } = useMutation({
    mutationFn: submitReceipt,
    onSuccess: async (data) => {
      await invalidateAll()
      setSuccessResult(data)
    },
  })
  const { enqueue, clearNotice, ...queueProps } = useReceiptQueue({
    onSynced: async (lastSynced, showSuccessCard) => {
      await invalidateAll()
      if (showSuccessCard && lastSynced) setSuccessResult(lastSynced)
    },
  })
  const sendValidatedKey = useCallback(
    async (accessKey: string, source: ScanSource) => {
      if (submitLockRef.current) return
      submitLockRef.current = true
      setSubmitError(null)
      clearNotice()
      const idempotencyKey = createIdempotencyKey()
      const saveQueued = () => {
        enqueue({ accessKey, source, idempotencyKey })
        if (source === "manual") manualForm.reset({ accessKey: "" })
      }
      try {
        if (typeof navigator !== "undefined" && !navigator.onLine) return saveQueued()
        await mutateAsync({ accessKey, source, idempotencyKey })
        if (source === "manual") manualForm.reset({ accessKey: "" })
      } catch (error) {
        if (isNetworkFailure(error)) saveQueued()
        else setSubmitError(messageFor(error))
      } finally {
        submitLockRef.current = false
      }
    },
    [clearNotice, enqueue, manualForm, mutateAsync],
  )
  const { resetCamera, ...cameraProps } = useQrCamera({
    enabled: mode === "camera" && successResult === null,
    isBusyRef: submitLockRef,
    onDetect: async (rawQr) => {
      const res = validateAccessKey(rawQr)
      // Envia o conteúdo bruto do QR: o backend precisa do hash para consultar
      // a SEFAZ e creditar 1 semente por real gasto.
      if (res.ok) await sendValidatedKey(rawQr, "qr")
      else setSubmitError(translateApiCode(res.code))
    },
  })
  const handlePasteKey = async () => {
    const applyError = (message: string) => manualForm.setError("accessKey", { message })
    if (typeof navigator === "undefined" || !navigator.clipboard?.readText)
      return applyError("Cole os números diretamente no campo acima.")
    try {
      const digits = extractAccessKeyDigits(await navigator.clipboard.readText())
      if (!digits) return applyError("Nenhum número encontrado na área de transferência.")
      manualForm.setValue("accessKey", formatAccessKeyGroups(digits), {
        shouldValidate: true,
        shouldTouch: true,
      })
      setSubmitError(null)
    } catch {
      applyError("Não foi possível ler a área de transferência. Cole direto no campo.")
    }
  }

  const watchedKey = useWatch({ control: manualForm.control, name: "accessKey" }) ?? ""
  const digitsCount = extractAccessKeyDigits(watchedKey).length
  const localValidation = digitsCount === 44 ? validateAccessKey(watchedKey) : null
  const decodedPreview = localValidation?.ok ? localValidation.decoded : null

  return {
    mode,
    switchMode: (nextMode: ScanMode) => {
      setSubmitError(null)
      if (nextMode === "camera") resetCamera()
      setMode(nextMode)
    },
    ...cameraProps,
    manualForm,
    onSubmitManual: (event?: BaseSyntheticEvent) =>
      void manualForm.handleSubmit(async (values) => {
        const res = validateAccessKey(values.accessKey)
        if (res.ok) await sendValidatedKey(res.key, "manual")
      })(event),
    handleManualInputChange: (rawValue: string) => {
      setSubmitError(null)
      return formatAccessKeyGroups(rawValue)
    },
    handlePasteKey: () => void handlePasteKey(),
    chunks: chunkAccessKey(watchedKey),
    digitsCount,
    decodedPreview,
    helpOpen,
    setHelpOpen,
    isSubmitting,
    submitError,
    successResult,
    resetForAnotherScan: () => {
      setSuccessResult(null)
      setSubmitError(null)
      clearNotice()
      manualForm.reset({ accessKey: "" })
      if (mode === "camera") resetCamera()
    },
    ...queueProps,
  }
}
