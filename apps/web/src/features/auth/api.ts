import type {
  MetaResult,
  RequestOtpInput,
  RequestOtpResult,
  VerifyOtpInput,
  VerifyOtpResult,
} from "./types"

import { api, requestExtensionJson, unwrap } from "@/api/client"
import { fetchServiceMeta } from "@/api/extensions"

export type { MetaResult, RequestOtpInput, RequestOtpResult, VerifyOtpInput, VerifyOtpResult }

export { fetchServiceMeta as fetchMeta }

export function requestOtp(input: RequestOtpInput): Promise<RequestOtpResult> {
  return unwrap(api.POST("/v1/auth/otp", { body: input }))
}

export function verifyOtp(input: VerifyOtpInput): Promise<VerifyOtpResult> {
  return requestExtensionJson<VerifyOtpResult>("/v1/auth/verify", {
    method: "POST",
    body: input,
  })
}
