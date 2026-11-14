import type { ServiceMeta } from "@/api/extensions"
import type { paths } from "@/api/schema"

export type MetaResult = ServiceMeta
export type RequestOtpInput =
  paths["/v1/auth/otp"]["post"]["requestBody"]["content"]["application/json"]
export type RequestOtpResult =
  paths["/v1/auth/otp"]["post"]["responses"][202]["content"]["application/json"]
export type BaseVerifyOtpInput =
  paths["/v1/auth/verify"]["post"]["requestBody"]["content"]["application/json"]
export type VerifyOtpInput = BaseVerifyOtpInput & {
  referral_code?: string
}
export type VerifyOtpResult =
  paths["/v1/auth/verify"]["post"]["responses"][200]["content"]["application/json"]
