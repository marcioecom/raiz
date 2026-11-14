const API_ERROR_MESSAGES: Record<string, string> = {
  already_claimed: "Este cupom já foi registrado.",
  daily_limit: "Você atingiu o limite diário de 5 cupons. Volte amanhã.",
  daily_limit_reached: "Você atingiu o limite diário de 5 cupons. Volte amanhã.",
  store_daily_limit: "Você já registrou um cupom desta loja hoje.",
  expired_receipt: "Este cupom passou do prazo de 72 horas desde a emissão.",
  receipt_too_old: "Este cupom passou do prazo de 72 horas desde a emissão.",
  invalid_access_key: "Chave de acesso inválida. Confira os 44 dígitos do cupom.",
  empty_access_key: "Informe os 44 dígitos da chave de acesso do cupom.",
  invalid_length: "A chave de acesso precisa ter exatamente 44 dígitos.",
  invalid_chars: "A chave de acesso deve conter apenas números.",
  invalid_check_digit: "O dígito verificador da chave não confere. Confira os números.",
  invalid_uf: "O código do estado na chave do cupom não é válido.",
  invalid_month: "O mês de emissão na chave do cupom não é válido.",
  invalid_model: "Este documento não é uma NF-e ou NFC-e válida.",
  invalid_emission_type: "A forma de emissão na chave do cupom não é válida.",
  invalid_otp: "Código incorreto. Confira os 6 dígitos e tente de novo.",
  invalid_code: "Código incorreto. Confira os 6 dígitos e tente de novo.",
  otp_expired: "Este código expirou. Peça um novo código para continuar.",
  invalid_phone: "Informe um telefone válido com DDD (10 ou 11 dígitos).",
  name_required:
    "Informe seu nome para o primeiro acesso. Toque em Alterar telefone e preencha seu nome.",
  invalid_name: "Informe um nome válido entre 2 e 80 caracteres.",
  invalid_body: "Confira os dados informados e tente de novo.",
  rate_limited: "Muitas tentativas seguidas. Aguarde um instante e tente de novo.",
  too_many_requests: "Muitas tentativas seguidas. Aguarde um instante e tente de novo.",
  insufficient_balance: "Você ainda não tem sementes suficientes para este prêmio.",
  insufficient_points: "Você ainda não tem sementes suficientes para este prêmio.",
  out_of_stock: "Este prêmio acabou no momento. Escolha outro benefício disponível.",
  reward_not_found: "Não encontramos o prêmio solicitado.",
  voucher_not_found: "Não encontramos um voucher com este código.",
  voucher_expired: "O prazo de 10 minutos deste voucher já expirou.",
  voucher_already_used: "Este voucher já foi utilizado no balcão.",
  invalid_referral_code:
    "Código de convite inválido ou não encontrado. Confira o link ou entre sem convite.",
  invalid_code_format:
    "Código com formato inválido. Confira os 6 dígitos ou caracteres informados.",
  account_deleted: "Esta conta foi encerrada e não está mais disponível para acesso.",
  unauthorized: "Sua sessão expirou. Entre novamente com seu telefone.",
  not_found: "Não encontramos o item solicitado.",
  network_error: "Sem conexão no momento. Confira sua internet e tente de novo.",
}

const DEFAULT_API_ERROR_MESSAGE = "Não foi possível concluir agora. Tente de novo em instantes."

export function translateApiCode(code: string): string {
  return API_ERROR_MESSAGES[code] ?? DEFAULT_API_ERROR_MESSAGE
}

export function messageFor(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code
    if (typeof code === "string" && code.length > 0) {
      return translateApiCode(code)
    }
  }

  if (error instanceof TypeError) {
    return API_ERROR_MESSAGES.network_error
  }

  return DEFAULT_API_ERROR_MESSAGE
}
