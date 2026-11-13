# Contexto do Projeto — Raiz

> **Documento vivo.** Consulte antes de iniciar novas implementações e atualize sempre que houver mudança de decisões arquiteturais, avanço de implementação (estado atual) ou alteração nas pendências.

**Projeto:** Raiz — *"quem volta, cria raiz"* (o clube de quem cria raiz no Capim)
**Evento:** HackaRun 2026 · UniCatólica (11–14/11/2026) · Desafio 05 (Engajamento e fidelização dos visitantes)
**Parceiro:** Capim Dourado Shopping (Palmas-TO)
**Requisito sorteado (avaliação):** Frontend e desenvolvimento — **Consumo de APIs** (*a interface deve buscar dados de uma API*)
**Base de planejamento:** [ENTREGA-1.md](../entregas/ENTREGA-1.md)

---

## 1. Visão do Projeto

### O problema que resolvemos
O shopping hoje mede **passagens e fluxo** (contadores infravermelhos, captive portal de Wi-Fi com captura de 3–8%, câmeras de heatmap/dwell time, pesquisas trimestrais e vendas agregadas de lojas onde 80–90% das notas não têm CPF), mas **não sabe quem voltou**. Sem identidade persistente do visitante, não há recorrência identificada, medição de cross-shopping entre lojas, LTV individual ou ação de reativação para quem parou de frequentar.

### A solução: Raiz
O **Raiz** é um **PWA mobile-first (sem instalação)** que cria identidade persistente e vínculo contínuo a partir de um comportamento que o visitante já possui: **escanear o QR Code da NFC-e** (ou digitar os 44 dígitos da chave de acesso) do cupom fiscal recebido na compra.

- **Para o visitante:** cada compra gera *sementes*, avança missões entre lojas e categorias e desbloqueia recompensas reais resgatáveis **na mesma visita** (ex.: café, estacionamento, ingresso).
- **Para o lojista:** tráfego qualificado e cross-shopping mensurável sem alterar o caixa (zero integração com PDV) e sem corroer margem com cupom de desconto genérico (prêmios cofinanciados em produto).
- **Para o shopping:** métrica real de recorrência identificada e base para retenção, eventos, valuation e atuação por API.

### Requisito sorteado: Consumo de APIs em três camadas
O tema sorteado é estrutural ao produto e aparece em três frentes auditáveis:
1. **Frontend → API própria (`/v1/*`):** 100% das telas consomem nossa API REST tipada (OpenAPI 3.1 + cliente gerado). É proibido usar dados mockados ou listas fixas no frontend.
2. **Backend → APIs externas:** consumo de **NFC-e / SEFAZ** (enriquecimento de valor total), **WhatsApp Cloud API** (envio de OTP/avisos) e **OpenWeather** (missão contextual), sempre com timeout de `2s`, circuit breaker simples e **fallback local obrigatório**.
3. **API exposta para parceiros/shopping:** `GET /v1/offers` (catálogo de ofertas) e `GET /v1/metrics/summary` (métricas agregadas de visitas identificadas, cross-store e recorrência).

### Métrica norte e metas de validação (demo)
- **Métrica norte:** cupons NFC-e válidos por visitante ativo na semana.
- **Metas de apoio definidas no planejamento:** ativação ≥ 60%, sucesso de leitura ≥ 85%, cross-store ≥ 1,8 CNPJs distintos por visitante, conclusão de missão ≥ 40%, retorno em 48h ≥ 50% e resgate ≥ 30%.

### Fora de escopo deliberado no MVP
- Integração com PDV de lojas ou painel administrativo completo do lojista.
- App nativo (React Native / Expo), cartão físico, cashback em reais ou cupom de desconto genérico.
- Check-in geolocalizado, beacons ou Wi-Fi captive portal.
- OCR de cupom impresso por foto (roadmap futuro; MVP usa QR + 44 dígitos manuais).
- Push notification, e-mail marketing, automação de CRM, multi-shopping, white-label e i18n.
- Gamificação infantilizada (avatar, mascote, "moedinha", emoji) e **chatbot enfeite**.

---

## 2. Stack Tecnológica e Estrutura Alvo

| Camada | Stack escolhida | Responsabilidade |
|---|---|---|
| **Frontend (`web/`)** | **React 19 + Vite**, **TypeScript**, **TanStack Router** (file-based), **TanStack Query**, **Tailwind CSS + shadcn/ui**, **Zod**, `vite-plugin-pwa`, `openapi-typescript` + `openapi-fetch`, **Vitest** | PWA mobile-first de 7 telas; barra inferior de 4 itens + botão de scan sempre visível; cliente HTTP 100% gerado de `docs/openapi.yaml`; cache, retry, optimistic update e fila offline no scan. |
| **Backend (`api/`)** | **Go 1.23 + Chi**, `pgx` + `database/sql` + **sqlc** (zero ORM), `golang-migrate`, JWT HS256 (30d) + OTP, `log/slog`, `/healthz` e `/docs` (Scalar / OpenAPI 3.1), `go test` | API REST `/v1/*` em binário único; parser local da chave NFC-e (44 dígitos, módulo 11); ledger transacional; regras de pontuação, missões, ritmo, resgate atômico e antifraude. |
| **Banco de dados (`db/`)** | **PostgreSQL 16** (Docker Compose local / Neon em produção) | Fonte da verdade em modelo ledger (`ledger`); constraints de unicidade e transações atômicas; massa demo em `db/seed.sql` (5 lojas parceiras, 40 cupons, 12 personas). |
| **Infra / Deploy** | **Vercel** (Web/CDN) · **Fly.io** região `gru` (API Go em imagem distroless) · **Neon** (Postgres serverless) | Custo R$ 0 na demo (free tiers); sem Redis, sem broker de fila externa e sem microsserviços. |

### Organização de diretórios planejada (pós-scaffold)
- `web/src/routes/` — rotas tipadas do TanStack Router (7 telas).
- `web/src/features/` — módulos de domínio (`home`, `scan`, `wallet`, `missions`, `rewards`).
- `web/src/api/` — tipos/client gerados de `docs/openapi.yaml` + hooks do TanStack Query.
- `web/src/components/` — componentes reutilizáveis (shadcn/ui).
- `api/cmd/api/main.go` — entrypoint HTTP.
- `api/internal/receipt/` — parser da chave NFC-e de 44 dígitos + validação módulo 11.
- `api/internal/points/` — ledger, cálculo de sementes, missões, ritmo e resgate atômico.
- `api/internal/http/` — rotas Chi, middlewares (auth, rate limit, idempotência) e erros padronizados.
- `api/migrations/` — migrações SQL versionadas (`golang-migrate`).
- `db/seed.sql` e `docker-compose.yml` — banco local e massa de dados de demonstração.
- `docs/openapi.yaml` — contrato OpenAPI 3.1 vivo.

---

## 3. Decisões Arquiteturais Tomadas

1. **PWA sem instalação em vez de app nativo:** instalação reduz drasticamente a conversão (mediana D30 de 4% em apps; 2–4% sem incentivo). Um link aberto via WhatsApp/QR Code funciona direto no navegador do visitante e da banca avaliadora.
2. **API REST única em Go (Chi + `sqlc`, sem ORM/BFF):** um único contrato HTTP tipado, compilação rápida em binário único, controle explícito de SQL e transações, evitando complexidade operacional de múltiplos serviços para ~6 horas de desenvolvimento.
3. **Contrato OpenAPI-First (`docs/openapi.yaml` + Scalar `/docs`):** o contrato dirige backend e frontend; payloads em `snake_case`, timestamps ISO-8601 UTC, valores monetários em centavos (`integer`, nunca `float`), erro padrão `{ "error": { "code", "message", "details" } }`, paginação por cursor e `Idempotency-Key` no envio de cupons.
4. **Saldo por Ledger (`ledger`) sem coluna `balance`:** não há saldo mutável na tabela de visitantes; o saldo é sempre a soma de `ledger.delta`, garantindo auditabilidade completa, histórico explicável e ranking como uma view sobre o próprio ledger.
5. **Validação local da chave NFC-e com degradação graciosa:** a chave de 44 dígitos já carrega CNPJ, UF, mês/ano e dígito verificador (módulo 11). A consulta à SEFAZ tem timeout de `2s` e serve apenas para enriquecer o valor total; se falhar, ou se o CNPJ não for parceiro, o cupom ainda pontua o valor base sem exibir erro.
6. **Entrada manual obrigatória na tela de scan + fila offline:** além da câmera/QR Code, a digitação dos 44 dígitos é requisito de primeira classe (mitiga QR apagado ou câmera ruim), e a persistência no TanStack Query protege o fluxo em 4G/Wi-Fi saturado.
7. **Antifraude por constraint e transação no banco:** unicidade de `receipts.access_key` e `redemptions.code` garantida pelo PostgreSQL, além de resgate atômico que impede saldo ou estoque negativos.
8. **LGPD e minimização desde a origem:** coleta apenas nome e telefone (sem senha, sem GPS, sem contatos); **CPF do cupom é descartado** imediatamente se lido; telefone armazenado com `phone_hash` + `phone_enc`; consentimento datado (`consent_at`); download e exclusão da conta disponíveis na UI (`DELETE /v1/me`); relatórios de parceiros estritamente agregados.
9. **Tom adulto/regional e estratégia de corte explícita:** linguagem limpa ligada ao cerrado/Capim Dourado (sem emoji/mascote/"moedinha"); dados de seed claramente sinalizados como demonstração; ordem de corte predefinida (`ranking → prêmios → missão de categoria → nível`), mantendo scan, saldo e início intactos.

---

## 4. Estado Atual (O que já está pronto)

*Atualizado com base no estado real do repositório:*

- **Concluído (Documentação e Especificação):**
  - [README.md](../README.md) — visão geral inicial do repositório.
  - [ENTREGA-1.md](../entregas/ENTREGA-1.md) — planejamento técnico completo da Entrega 1 (tese, mecânicas, personas, wireframes das 7 telas, arquitetura, schema, lista de endpoints, estratégia do item sorteado, plano de 6h, riscos, LGPD e modelo de negócio).
  - [AGENTS.md](../AGENTS.md) — guia operacional, regras imutáveis, convenções de código, limites de segurança/LGPD e fluxo de trabalho para agentes.
  - [docs/CONTEXTO_PROJETO.md](./CONTEXTO_PROJETO.md) — este documento (visão, stack, decisões arquiteturais, estado atual e pendências).
  - [docs/REGRAS_NEGOCIO.md](./REGRAS_NEGOCIO.md) — especificação consolidada de entidades, fluxos, validações e regras de domínio.
- **Não iniciado (0% implementado no código):**
  - Infraestrutura local (`docker-compose.yml`), migrações SQL (`api/migrations/`) e massa de dados (`db/seed.sql`).
  - Contrato HTTP formal (`docs/openapi.yaml`).
  - Backend Go (`api/`) — parser NFC-e, endpoints `/v1/*`, `/healthz`, `/docs`, ledger, regras de missão/resgate e integrações externas.
  - Frontend PWA (`web/`) — rotas TanStack Router, client tipado gerado do OpenAPI, hooks TanStack Query e as 7 telas.
  - Testes automatizados (`go test`, `vitest`) e deploy (Vercel, Fly.io, Neon).

---

## 5. Pendências

Organizadas segundo os blocos de execução previstos em [ENTREGA-1.md §9](../entregas/ENTREGA-1.md#L627-L640) e lacunas de especificação a fechar antes/durante o scaffold:

### Bloco 0 (Pré-scaffold / Fechamento de contrato)
- [ ] Fechar especificações ainda abertas para o `docs/openapi.yaml` e `api/migrations/`:
  - Mecanismo de autenticação/escopo de API para parceiros em `GET /v1/offers` e `GET /v1/metrics/summary`.
  - Endpoint/contrato para exportação de dados LGPD ("baixar meus dados" na Tela 7) e vínculo de convite/indicação (`+100` sementes no 1º cupom do convidado).
  - Estrutura relacional para ofertas/eventos exibidos em `GET /v1/home` ("Hoje no Capim") e `GET /v1/offers`, e para a fila de revisão de CNPJs desconhecidos.
  - Catálogo padronizado de `error.code` além de `409 already_claimed` (limites diários, janela de 72h, chave inválida, saldo insuficiente, estoque esgotado).
  - Fuso de referência para regras diárias/semanais (ex.: `America/Araguaina` vs UTC) e definição exata da janela de "mesma semana" na missão de categoria.

### Bloco 1 (0h–1h) — Infraestrutura, Banco e Hello World
- [ ] Criar `docker-compose.yml` com PostgreSQL 16.
- [ ] Inicializar projeto Go em `api/` (Chi, `pgx`, `sqlc`, `golang-migrate`, `log/slog`) e endpoint `GET /healthz`.
- [ ] Criar migrações iniciais em `api/migrations/` com tabelas, constraints e índices mínimos, além do `db/seed.sql` (5 lojas parceiras, 40 cupons, 12 personas).
- [ ] Escrever `docs/openapi.yaml` e expor `GET /docs` (Scalar).
- [ ] Inicializar PWA em `web/` (React 19, Vite, TanStack Router, TanStack Query, Tailwind + shadcn/ui, Zod, `vite-plugin-pwa`, `openapi-typescript` + `openapi-fetch`).
- [ ] Realizar deploy inicial ("hello") com URL pública (Vercel + Fly.io `gru` + Neon).

### Bloco 2 (1h–2h) — Autenticação e LGPD base
- [ ] Implementar `POST /v1/auth/otp` (WhatsApp Cloud API com timeout `2s` e modo demo `000000`) e `POST /v1/auth/verify` (JWT HS256 30d, `consent_at`, `phone_hash` + `phone_enc`, rate limit).
- [ ] Implementar `GET /v1/me` e `DELETE /v1/me` (soft delete com `deleted_at`) + exportação de dados do titular.

### Bloco 3 (2h–3h30) — Parser NFC-e, Ledger e Envio de Cupom
- [ ] Implementar parser local de chave de 44 dígitos + validação módulo 11 + extração de CNPJ, UF e mês/ano (`api/internal/receipt/`).
- [ ] Implementar integração opcional com SEFAZ (timeout `2s`, circuit breaker, descarte imediato de CPF e fallback para valor base).
- [ ] Implementar `POST /v1/receipts` com `Idempotency-Key`, regras antifraude (`409` duplicado, 1/loja/dia, 5/dia, janela 72h), tratamento silencioso de CNPJ desconhecido (`10` sementes + fila de revisão) e escrita transacional em `receipts` + `ledger`.
- [ ] Implementar `GET /v1/me/ledger` (paginação por cursor) e `GET /v1/home` (agregado único).

### Bloco 4 (3h30–4h30) — Telas Início, Entrada, Scan e Carteira
- [ ] Implementar Tela 1 (Entrada), Tela 2 (Início com skeleton/retry), Tela 3 (Scan com câmera + digitação manual obrigatória dos 44 dígitos + fila offline) e Tela 4 (Carteira/extrato) consumindo 100% a API via client gerado.

### Bloco 5 (4h30–5h15) — Missões, Safra, Resgate, Parceiros e Perfil
- [ ] Implementar motor de missões (3 CNPJs em 7 dias `+150` única vez; alimentação + moda `+100`), ritmo (4 semanas `+200`), indicação (`+100` para ambos), níveis (`Semente`, `Raiz`, `Dourado`), safra e ranking como view sobre `ledger`.
- [ ] Implementar `GET /v1/missions`, `GET /v1/leaderboard`, `GET /v1/rewards` e `POST /v1/rewards/{id}/redeem` (transação atômica, saldo nunca negativo, decremento de estoque, voucher de 6 dígitos/caracteres válido por 10 min).
- [ ] Implementar API pública/parceiro (`GET /v1/offers` e `GET /v1/metrics/summary` agregado) e integração opcional OpenWeather (`timeout 2s` + fallback).
- [ ] Implementar Telas 5 (Missões e Safra), 6 (Prêmios e Voucher com optimistic update) e 7 (Perfil e LGPD).

### Bloco 6 (5h15–6h) — Testes, Validação Final e Demo
- [ ] Cobrir cenários obrigatórios com `go test ./...`, `go vet ./...`, `npx vitest run`, `npx tsc --noEmit` e `npm run build`.
- [ ] Garantir sinalização explícita de dados de demonstração (`seed`) e modo demo (`000000`) na UI.
- [ ] Ensaiar fluxo completo de palco (inclusive modo offline/fallback) e validação com cupons reais.
