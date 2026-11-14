import type { paths } from "@/api/schema"

import { api, unwrap } from "@/api/client"

export type MetaResult = paths["/v1/meta"]["get"]["responses"][200]["content"]["application/json"]
export type RequestOtpInput =
  paths["/v1/auth/otp"]["post"]["requestBody"]["content"]["application/json"]
export type RequestOtpResult =
  paths["/v1/auth/otp"]["post"]["responses"][202]["content"]["application/json"]
export type VerifyOtpInput =
  paths["/v1/auth/verify"]["post"]["requestBody"]["content"]["application/json"]
export type VerifyOtpResult =
  paths["/v1/auth/verify"]["post"]["responses"][200]["content"]["application/json"]

export function fetchMeta(): Promise<MetaResult> {
  return unwrap(api.GET("/v1/meta"))
}

export function requestOtp(input: RequestOtpInput): Promise<RequestOtpResult> {
  return unwrap(api.POST("/v1/auth/otp", { body: input }))
}

export function verifyOtp(input: VerifyOtpInput): Promise<VerifyOtpResult> {
  return unwrap(api.POST("/v1/auth/verify", { body: input }))
}
