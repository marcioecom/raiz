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
| **Frontend (`apps/web/`)** | **React 19 + Vite**, **TypeScript**, **TanStack Router** (file-based), **TanStack Query**, **Tailwind CSS + shadcn/ui**, **Zod**, `vite-plugin-pwa`, `openapi-typescript` + `openapi-fetch`, **Vitest** | PWA mobile-first de 7 telas; barra inferior de 4 itens + botão de scan sempre visível; cliente HTTP 100% gerado de `docs/openapi.yaml`; cache, retry, optimistic update e fila offline no scan. |
| **Backend (`apps/api/`)** | **Go 1.23 + Chi** (+ `go-chi/cors`), `pgx` (+ `sqlc` na primeira query), migrações SQL embutidas (nomes compatíveis com `golang-migrate`), **`caarlos0/env` + `validator/v10` + `godotenv`** para config, JWT HS256 (30d) + OTP, `log/slog`, `/healthz` e `/docs` (Scalar / OpenAPI 3.1), `go test` | API REST `/v1/*` em binário único; parser local da chave NFC-e (44 dígitos, módulo 11); ledger transacional; regras de pontuação, missões, ritmo, resgate atômico e antifraude. |
| **Banco de dados (`apps/api/internal/database/`)** | **PostgreSQL 16** (Docker Compose local / Neon em produção) | Fonte da verdade em modelo ledger (`ledger`); constraints de unicidade e transações atômicas; massa demo em `apps/api/internal/database/seed.sql` (5 lojas, safra, missões, prêmios, ofertas e eventos). |
| **Infra / Deploy** | **Vercel** (Web/CDN) · **Fly.io** região `gru` (API Go em imagem distroless) · **Neon** (Postgres serverless) | Custo R$ 0 na demo (free tiers); sem Redis, sem broker de fila externa e sem microsserviços. |

### Organização de diretórios (monorepo `apps/`)
- `apps/web/src/routes/` — rotas tipadas do TanStack Router (7 telas).
- `apps/web/src/features/` — módulos de domínio (`home`, `scan`, `wallet`, `missions`, `rewards`).
- `apps/web/src/api/` — transport (schema gerado + client + `ApiError`); hooks ficam na feature.
- `apps/web/src/components/` — componentes reutilizáveis (shadcn/ui).
- `apps/api/cmd/api/` — entrypoint HTTP; `cmd/migrate/` e `cmd/seed/` — binários de banco.
- `apps/api/internal/config/` — fonte única de env (tags `env` + `validate`, falha no boot) e `config_test.go`.
- `apps/api/internal/database/` — pool, runner de migrações, `seed.sql` e binários de suporte.
- `apps/api/internal/receipt/` — parser da chave NFC-e de 44 dígitos + validação módulo 11.
- `apps/api/internal/httpapi/` — rotas Chi, middlewares (`chi/cors`, compress, timeout, request size), erros e `/docs`.
- `apps/api/internal/points/` — regras de pontos, antifraude e missões como funções puras, mais o ponto de enriquecimento da SEFAZ (`TotalFetcher`).
- `docs/openapi.yaml` — contrato OpenAPI 3.1 vivo, compartilhado entre API e front.

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
10. **Monorepo em `apps/`:** `apps/api` e `apps/web` são aplicações independentes com builds próprios; o contrato (`docs/openapi.yaml`) e a documentação ficam na raiz. Evita que o frontend e o backend disputem a raiz do repositório e deixa claro o que é infra compartilhada.
11. **Config com biblioteca, não com `os.Getenv`:** `caarlos0/env` + `validator/v10` + `godotenv`, fonte única em `internal/config` e falha no boot. Segredos e DSN não têm default; `.env.example` é a documentação versionada.
12. **Código da API em inglês:** identificadores, tabelas, colunas, comentários, logs e mensagens de erro em inglês; copy de produto (missão, prêmio, oferta) em pt-BR. O front traduz `error.code` via `messages.ts`, então a mensagem da API nunca aparece crua na tela.

---

## 4. Estado Atual (O que já está pronto)

*Atualizado em 13/11/2026.*

- **Documentação e especificação:** [README.md](../README.md), [ENTREGA-1.md](../entregas/ENTREGA-1.md) (+ PDF), [AGENTS.md](../AGENTS.md), [apps/web/AGENTS.md](../apps/web/AGENTS.md), este documento e [REGRAS_NEGOCIO.md](./REGRAS_NEGOCIO.md).
- **Scaffold da API (`apps/api/`) — verificado rodando local:**
  - `docker-compose.yml` (PostgreSQL 16) e `apps/api/internal/database/seed.sql` aplicados: 5 lojas, 1 safra, 3 missões, 4 prêmios, 3 ofertas e 2 eventos.
  - Go module (`github.com/marcioecom/raiz/apps/api`) + Chi + `pgx` + `log/slog`; CORS via `go-chi/cors`, `Compress`, `CleanPath`, `GetHead`, `NoCache`, `RequestSize`, `Timeout`, recoverer e request log; shutdown gracioso em `cmd/api/main.go`.
  - Config única em `internal/config` (`env` + `validate` + `godotenv`), com **falha no boot** quando falta `DATABASE_URL` ou `JWT_SECRET` (verificado) e 6 testes de contrato.
  - `GET /healthz` com ping real no banco (503 quando indisponível), `GET /v1/meta`, `GET /docs` (Scalar) e `GET /openapi.yaml`.
  - Migrações `000001_init` (9 tabelas + `schema_migrations`, constraints de unicidade e índices) e `000002_offers_events` (ofertas, eventos, chaves de parceiro), aplicadas no boot; binários `cmd/migrate` e `cmd/seed` (seed idempotente, verificado).
  - Parser da chave NFC-e em `apps/api/internal/receipt/`: 44 dígitos crus, com separadores ou conteúdo do QR (`p=`), módulo 11, extração de UF/CNPJ/mês/modelo/emissão — 12 casos de teste passando.
  - `docs/openapi.yaml` (OpenAPI 3.1) cobrindo auth, visitante, cupom, missões, prêmios, parceiro e sistema — é a fonte do client tipado do front.
- **Auth e visitante (bloco 2) — implementado e verificado ao vivo:**
  - `POST /v1/auth/otp` (código de 6 dígitos, 5 min, hash HMAC; `000000` em demo) e `POST /v1/auth/verify` (JWT HS256 30d, `consent_at`, nome só no primeiro acesso).
  - `GET /v1/me` (saldo do ledger, nível Semente/Raiz/Dourado, `next_tier_at` = quanto falta, streak em semanas ISO, contagem e primeira visita) e `DELETE /v1/me` (soft delete; token passa a dar 401).
  - `internal/pii` (normalização de telefone, HMAC-SHA256 e AES-256-GCM com `PII_KEY`), `internal/auth` (JWT), `internal/store` (pgx puro), middleware `requireAuth`; telefone nunca é logado.
  - Migração `000003_otp_codes`; testes de handler com stub (sem Postgres) e smoke real: otp → verify → /me → delete.
- **Cupom e ledger (bloco 3) — implementado e verificado ao vivo:**
  - `POST /v1/receipts`: parse local (`422` com o código do parser e `details.field=access_key`), `409 already_claimed` pela chave fiscal (a constraint `UNIQUE` é a última defesa) e antifraude em ordem `receipt_too_old` → `store_daily_limit` → `daily_limit_reached`, sempre sobre a data de emissão; grava `receipts` + `ledger` em uma transação e credita 10 sementes com `status=review` quando o CNPJ é desconhecido.
  - SEFAZ apenas enriquece: interface `points.TotalFetcher` (`FetchTotal`, timeout de `2s` no chamador) com implementação local `ok=false`; qualquer falha externa degrada para o valor base sem bloquear o crédito.
  - Missões `stores` (3 CNPJs em 7 dias) e `category` (categorias distintas na semana ISO) avançam `mission_progress` (upsert + `greatest`) e creditam `reward_points` uma única vez, com claim guardado por `completed_at`; o avanço volta em `missions_advanced`. `rhythm` fica para o próximo bloco.
  - `GET /v1/me/ledger` com keyset `(created_at, id)`, cursor opaco base64url, `limit` 20/50 e `description` em pt-BR. O seed ganhou os dois CNPJs reais da demo (Centauro e Leitura Palmas Livraria e Papelaria).
- **Tela inicial, missões e ranking (parte dos blocos 4 e 5) — implementado e verificado ao vivo:**
  - `GET /v1/home` com uma consulta por seção (sem N+1): `demo`, primeiro nome, saldo, nível, ritmo, `next_step` (missão mais próxima de concluir → prêmio mais próximo do saldo → `null`), eventos ativos de hoje no fuso `America/Araguaina` (tzdata embutido, fallback `-03:00`), até 3 ofertas válidas e `closest_reward` com quanto falta.
  - `GET /v1/missions` com a safra ativa e o progresso calculado pelas mesmas regras do scan (concluídas por último, progresso desc) e `GET /v1/leaderboard` como view sobre o `ledger` da safra: top 10 (máx 50), nome abreviado (`M. J.`), `is_me` e bloco `me` com posição e pontos mesmo fora do top.
  - Missão de categoria corrigida: migração `000004_mission_categories` (`missions.categories text[]`), seed com `{alimentacao,moda}` e `points.Advance` contando apenas as categorias listadas — livraria + esportes não conclui mais "Alimentação + moda" (teste dedicado em `points` e smoke real).
  - Testes novos sem Postgres: escolha do `next_step` (missão, prêmio, `null`), janela do dia no fuso do shopping, ordenação/progresso de missões, abreviação de nome e posição do `me` fora do top.
- **Prêmios, resgate, ritmo e API de parceiro (bloco 6) — implementado e verificado ao vivo:**
  - `GET /v1/rewards` lista o catálogo `active` com `store_name`, `terms`, `stock`, `cost` e `affordable` (cost ≤ soma do `ledger`), ordenado por `cost asc`.
  - `POST /v1/rewards/{id}/redeem` roda em uma transação: `select ... for update` no prêmio (404 `reward_not_found` se inativo/inexistente), `409 out_of_stock`, saldo relido **depois** do lock com `409 insufficient_points` (`details.missing`), débito `ledger(kind='redeem')`, `rewards.stock - 1` quando não nulo e voucher de 6 caracteres sem ambíguos (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, validade de 10 min); colisão de código tenta até 3 vezes e a constraint `UNIQUE` é a garantia final.
  - Missão `rhythm` deixou de ficar em 0/4: progresso = semanas ISO consecutivas com ao menos um cupom (`store.StreakWeeks`, teto no `target`) e crédito único pelo mesmo claim de `completed_at` das outras missões.
  - API de parceiro com `X-API-Key` (`PARTNER_API_KEY`, opcional e sem default; vazia ⇒ as rotas respondem `404`, comparada com `crypto/subtle.ConstantTimeCompare`): `GET /v1/offers` com filtro `store_id` e cursor `(valid_until nulls last, id)` de 50 em 50, e `GET /v1/metrics/summary` só com agregados (default de 30 dias, `identified_visits`, `unique_visitors`, `returning_rate`, `cross_store_ratio`, `redemptions`, `top_stores` top 5).
  - Testes sem Postgres: resgate feliz (saldo/estoque), saldo insuficiente, estoque esgotado, prêmio inexistente, parceiro sem chave (404) e chave errada (401), ofertas paginadas, métricas de período vazio e ritmo (3 semanas = 3/4; 4 semanas conclui e credita uma vez). Smoke real: 5 cupons → 300 sementes, voucher `T48Y9F` com `balance_after` 50, segundo resgate `409 insufficient_points (missing: 200)` e parceiro 200/401 com/sem chave.
- **Não iniciado no código:** indicação (`+100` para os dois), integrações externas (SEFAZ, WhatsApp, OpenWeather), frontend PWA, deploy e testes de front.

> **Desvios conscientes do scaffold:** as migrações rodam no boot por um runner embutido (nomes compatíveis com `golang-migrate`) em vez do binário `migrate`; `sqlc` entra na primeira query (hoje existe banco, pool e schema, sem queries). Ambos reversíveis sem mudar o contrato.

---

## 5. Pendências

Organizadas segundo os blocos de execução previstos em [ENTREGA-1.md §9](../entregas/ENTREGA-1.md#L627-L640) e lacunas de especificação a fechar antes/durante o scaffold:

### Bloco 0 (Pré-scaffold / Fechamento de contrato)
- [ ] Fechar especificações ainda abertas para o `docs/openapi.yaml` e `apps/api/internal/database/migrations/`:
  - Mecanismo de autenticação/escopo de API para parceiros em `GET /v1/offers` e `GET /v1/metrics/summary`.
  - Endpoint/contrato para exportação de dados LGPD ("baixar meus dados" na Tela 7) e vínculo de convite/indicação (`+100` sementes no 1º cupom do convidado).
  - Estrutura relacional para ofertas/eventos exibidos em `GET /v1/home` ("Hoje no Capim") e `GET /v1/offers`, e para a fila de revisão de CNPJs desconhecidos.
  - Catálogo padronizado de `error.code` além de `409 already_claimed` (limites diários, janela de 72h, chave inválida, saldo insuficiente, estoque esgotado).
  - Fuso de referência para regras diárias/semanais (ex.: `America/Araguaina` vs UTC) e definição exata da janela de "mesma semana" na missão de categoria.

### Bloco 1 (0h–1h) — Infraestrutura, Banco e Hello World
- [x] Criar `docker-compose.yml` com PostgreSQL 16.
- [x] Inicializar projeto Go em `apps/api/` (Chi, `pgx`, `log/slog`) e endpoint `GET /healthz`. *(`sqlc` e `golang-migrate` binário ficam para a primeira query/CI; ver desvios na §4.)*
- [x] Criar migrações iniciais com tabelas, constraints e índices, além do `apps/api/internal/database/seed.sql` (5 lojas, safra, missões, prêmios, ofertas e eventos; cupons/personas de demo entram no Bloco 3).
- [x] Escrever `docs/openapi.yaml` e expor `GET /docs` (Scalar).
- [x] Inicializar PWA em `apps/web/` (React 19, Vite, TanStack Router, TanStack Query, Tailwind + shadcn/ui, Zod, `vite-plugin-pwa`, `openapi-typescript` + `openapi-fetch`) — padrão em [apps/web/AGENTS.md](../apps/web/AGENTS.md) e [DESIGN.md](./DESIGN.md).
- [ ] Realizar deploy inicial ("hello") com URL pública (Vercel + Fly.io `gru` + Neon).

### Bloco 2 (1h–2h) — Autenticação e LGPD base
- [ ] Implementar `POST /v1/auth/otp` (WhatsApp Cloud API com timeout `2s` e modo demo `000000`) e `POST /v1/auth/verify` (JWT HS256 30d, `consent_at`, `phone_hash` + `phone_enc`, rate limit).
- [ ] Implementar `GET /v1/me` e `DELETE /v1/me` (soft delete com `deleted_at`) + exportação de dados do titular.

### Bloco 3 (2h–3h30) — Parser NFC-e, Ledger e Envio de Cupom
- [x] Implementar parser local de chave de 44 dígitos + validação módulo 11 + extração de CNPJ, UF e mês/ano (`apps/api/internal/receipt/`, com testes).
- [ ] Implementar integração opcional com SEFAZ (timeout `2s`, circuit breaker, descarte imediato de CPF e fallback para valor base). *(interface `points.TotalFetcher` e fallback prontos; cliente HTTP pendente.)*
- [x] Implementar `POST /v1/receipts` com `Idempotency-Key`, regras antifraude (`409` duplicado, 1/loja/dia, 5/dia, janela 72h), tratamento silencioso de CNPJ desconhecido (`10` sementes + fila de revisão) e escrita transacional em `receipts` + `ledger`.
- [x] Implementar `GET /v1/me/ledger` (paginação por cursor).
- [ ] Implementar `GET /v1/home` (agregado único).

### Bloco 4 (3h30–4h30) — Telas Início, Entrada, Scan e Carteira
- [x] Implementar Tela 1 (Entrada), Tela 2 (Início com skeleton/retry), Tela 3 (Scan com câmera + digitação manual obrigatória dos 44 dígitos + fila offline) e Tela 4 (Carteira/extrato) consumindo 100% a API via client gerado.

### Bloco 5 (4h30–5h15) — Missões, Safra, Resgate, Parceiros e Perfil
- [ ] Implementar motor de missões (3 CNPJs em 7 dias `+150` única vez; alimentação + moda `+100`), ritmo (4 semanas `+200`), indicação (`+100` para ambos), níveis (`Semente`, `Raiz`, `Dourado`), safra e ranking como view sobre `ledger`. *(Missões `stores`/`category`, ritmo, níveis, safra e ranking prontos; falta só a indicação.)*
- [x] Implementar `GET /v1/missions`, `GET /v1/leaderboard`, `GET /v1/rewards` e `POST /v1/rewards/{id}/redeem` (transação atômica, saldo nunca negativo, decremento de estoque, voucher de 6 dígitos/caracteres válido por 10 min).
- [x] Implementar API pública/parceiro (`GET /v1/offers` e `GET /v1/metrics/summary` agregado) com `X-API-Key` (`PARTNER_API_KEY`), desabilitada (404) quando a chave não está configurada.
- [ ] Implementar integração opcional OpenWeather (`timeout 2s` + fallback).
- [ ] Implementar Telas 5 (Missões e Safra), 6 (Prêmios e Voucher com optimistic update) e 7 (Perfil e LGPD).

### Bloco 6 (5h15–6h) — Testes, Validação Final e Demo
- [ ] Cobrir cenários obrigatórios com `go test ./...`, `go vet ./...`, `npx vitest run`, `npx tsc --noEmit` e `npm run build` *(suíte unitária, typecheck e build do frontend concluídos; testes de integração contra handlers Go pendentes)*.
- [x] Garantir sinalização explícita de dados de demonstração (`seed`) e modo demo (`000000`) na UI.
- [ ] Ensaiar fluxo completo de palco (inclusive modo offline/fallback) e validação com cupons reais.
