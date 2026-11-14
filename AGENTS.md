# AGENTS.md — Raiz (HackaRun 2026)

Guia operacional para agentes trabalhando no projeto **Raiz** ("quem volta, cria raiz") — Desafio 05 do HackaRun 2026 (UniCatólica · Capim Dourado Shopping, Palmas-TO).

---

## 1. Objetivo do projeto

Construir o **Raiz**, um **PWA mobile-first (sem instalação)** de engajamento e fidelização contínua que cria identidade persistente do visitante a partir de um comportamento que ele já possui: **escanear o QR Code da NFC-e** (ou digitar os 44 dígitos da chave de acesso) do cupom fiscal.

- **Problema central:** o shopping mede fluxo/passagens, mas não sabe **quem voltou** (recorrência identificada, cross-shopping entre lojas e LTV) sem depender de integração com PDV.
- **Mecanismo:** cada cupom gera *sementes*, avança missões entre lojas/categorias e libera recompensas reais resgatáveis **na mesma visita**, sem alterar o caixa do lojista.
- **Requisito sorteado (obrigatório na avaliação):** **Consumo de APIs** em três camadas:
  1. A interface (`apps/web/`) consome **100% a nossa API REST tipada** (`/v1/*`) — proibido dado mockado ou lista fixa no frontend.
  2. O backend (`apps/api/`) consome APIs externas (**NFC-e/SEFAZ**, **WhatsApp Cloud API**, **OpenWeather**) com fallback local obrigatório.
  3. Exposição de API para parceiros/lojistas/shopping (`GET /v1/offers` e `GET /v1/metrics/summary`).
- **O que o Raiz NÃO é (fora de escopo do MVP):** cashback em reais, cartão físico, app nativo (React Native/Expo), cupom de desconto genérico, integração com PDV de loja, painel administrativo completo do lojista, check-in geolocalizado/beacons/Wi-Fi captive portal, OCR de cupom por foto (roadmap), push/e-mail marketing/CRM, multi-shopping/white-label/i18n, gamificação infantilizada e **chatbot enfeite**.

---

## 2. Stack e arquitetura

> **Nota sobre estado atual:** o repositório tem a documentação (`README.md`, `AGENTS.md`, [entregas/ENTREGA-1.md](./entregas/ENTREGA-1.md) + [ENTREGA-1.pdf](./entregas/ENTREGA-1.pdf), [docs/CONTEXTO_PROJETO.md](./docs/CONTEXTO_PROJETO.md), [docs/REGRAS_NEGOCIO.md](./docs/REGRAS_NEGOCIO.md), [docs/openapi.yaml](./docs/openapi.yaml) e a planta do shopping em `docs/referencias/`) e o **scaffold da API** (`docker-compose.yml`, `apps/api/internal/database/seed.sql`, `apps/api/` com `/healthz`, `/docs`, migrações e o parser da NFC-e). O módulo `apps/web/` ainda não existe: o padrão de organização a seguir está em [apps/web/AGENTS.md](./apps/web/AGENTS.md). Consulte [docs/CONTEXTO_PROJETO.md](./docs/CONTEXTO_PROJETO.md) para o estado atual e as pendências.

### Tecnologias por camada

| Camada | Stack | Responsabilidade |
|---|---|---|
| **Frontend (`apps/web/`)** | React 19 + Vite, TypeScript, **TanStack Router** (file-based), **TanStack Query**, Tailwind CSS + shadcn/ui, Zod, `vite-plugin-pwa`, `openapi-typescript` + `openapi-fetch` | PWA de 7 telas, barra inferior de 4 itens (`Início · Missões · Carteira · Perfil`) + botão de scan sempre visível, estado offline/fila no scan e optimistic update no resgate. |
| **Backend (`apps/api/`)** | **Go 1.23** + **Chi**, `pgx` (+ `sqlc` na primeira query), migrações SQL embutidas com nomes compatíveis com `golang-migrate`, `caarlos0/env` + `validator`, JWT HS256 (30d) + OTP, `log/slog`, `/healthz` e `/docs` (Scalar / OpenAPI 3.1) | API REST `/v1/*` em binário único, parser local da chave NFC-e (módulo 11), ledger transacional, regras de missão/ritmo/resgate e antifraude. |
| **Banco (`apps/api/internal/database/`)** | **PostgreSQL 16** (Docker Compose local / Neon em produção) | Fonte da verdade em modelo **ledger** (`ledger`); seed demo em `apps/api/internal/database/seed.sql` (5 lojas parceiras, 40 cupons, 12 personas). |
| **Deploy / Infra** | Cloudflare Workers static assets (Web/CDN, `apps/web/wrangler.jsonc`) · Fly.io região `gru` (API Go em imagem distroless) · Neon (Postgres) | Sem Redis, sem fila externa, sem microsserviços no MVP (~6h de código). |

### Organização de diretórios (alvo)

- `apps/web/src/routes/` — rotas tipadas do TanStack Router (7 telas: Entrada, Início, Scan, Carteira, Missões/Safra, Prêmios/Voucher, Perfil/LGPD).
- `apps/web/src/features/` — módulos de domínio (`home`, `scan`, `wallet`, `missions`, `rewards`).
- `apps/web/src/api/` — client e tipos gerados de `docs/openapi.yaml` + hooks do TanStack Query.
- `apps/web/src/components/` — componentes reutilizáveis (shadcn/ui).
- `apps/api/cmd/api/main.go` — entrypoint HTTP.
- `apps/api/internal/receipt/` — parser da chave de acesso de 44 dígitos + validação módulo 11.
- `apps/api/internal/points/` — ledger, cálculo de sementes, missões, ritmo e resgate atômico.
- `apps/api/internal/http/` — rotas Chi, middlewares (auth, rate limit, idempotência) e padronização de erros.
- `apps/api/internal/database/migrations/` — migrações SQL versionadas (`golang-migrate`).
- `apps/api/internal/database/seed.sql` e `docker-compose.yml` — Postgres local e massa de dados de demonstração.
- `docs/openapi.yaml` — contrato OpenAPI 3.1.

### Modelo de dados (tabelas principais)

- `visitors (id, phone_hash, phone_enc, name, created_at, consent_at, deleted_at)`
- `stores (id, cnpj, name, category, floor, is_partner)`
- `receipts (id, visitor_id, store_id, access_key UNIQUE, total_cents NULL, issued_at, points_awarded, source, created_at)`
- `ledger (id, visitor_id, kind, delta, ref_type, ref_id, created_at)` — **fonte da verdade do saldo**
- `missions (id, season_id, code, title, rule_type, target, reward_points)`
- `mission_progress (visitor_id, mission_id, counter, completed_at)`
- `seasons (id, name, starts_at, ends_at, status)`
- `rewards (id, store_id NULL, title, cost, stock NULL, terms)`
- `redemptions (id, visitor_id, reward_id, code UNIQUE, status, created_at, used_at)`
- Índices mínimos: `receipts(visitor_id, created_at)`, `ledger(visitor_id, created_at)`, `receipts(store_id, issued_at)`.

---

## 3. Regras de negócio (imutáveis sem aprovação)

Não altere nenhum dos comportamentos abaixo sem aprovação explícita (a especificação detalhada de entidades, fluxos, validações e regras de domínio reside em [docs/REGRAS_NEGOCIO.md](./docs/REGRAS_NEGOCIO.md)):

1. **Cadastro mínimo e consentimento:** pedir apenas **nome e telefone** (sem senha, sem exigir instalação/atalho). Registrar consentimento com data/hora (`consent_at`). Em ambiente de demonstração, usar OTP fixo `000000` (identificado na tela como modo demo).
2. **Validação de NFC-e e fallback:**
   - A chave de acesso (44 dígitos) é validada **localmente** (formato + dígito verificador módulo 11), extraindo CNPJ, UF e mês/ano.
   - A tela de scan **deve obrigatoriamente** oferecer entrada manual dos 44 dígitos junto à câmera (não é opcional).
   - Consulta à SEFAZ é enriquecimento opcional (`timeout 2s`); falha externa **nunca** pode impedir o registro do cupom.
   - **CNPJ desconhecido** (loja fora do cadastro parceiro) **pontua valor base** (10 sementes) e entra em fila de revisão — **nunca exibir erro ao visitante**.
3. **Pontuação e mecânicas:**
   - **Cupom:** `10` sementes base `+ 1` por real gasto (quando o valor total em `total_cents` estiver disponível).
   - **Missão de loja:** visitar 3 CNPJs diferentes em 7 dias → `+150` sementes (conclui uma única vez).
   - **Missão de categoria:** alimentação + moda na mesma semana → `+100` sementes.
   - **Ritmo:** 4 semanas seguidas com ≥ 1 cupom → `+200` sementes. **Nunca punir falta:** quebrar sequência reseta o contador/multiplicador, **jamais subtrai sementes**.
   - **Safra:** ciclo de 8 semanas; top 10 ganha experiência (camarote, valet). O **ranking é uma view sobre o `ledger`**, não um sistema à parte.
   - **Níveis (12 meses móveis):** `Semente` (inicial) → `Raiz` (`≥ 500` sementes/12m) → `Dourado` (`≥ 2.000` sementes/12m).
   - **Indicação:** convidado valida o 1º cupom → `+100` sementes para os dois.
4. **Antifraude no MVP:**
   - Chave de acesso única por constraint no banco (`409 already_claimed` em tentativa repetida; nunca creditar duas vezes).
   - Máximo de **1 cupom por loja por dia** por visitante.
   - Teto de **5 cupons/dia** por visitante.
   - Janela máxima de emissão de **72 horas**.
5. **Ledger e resgate atômico:**
   - **Não existe coluna `balance` em `visitors`:** o saldo é sempre a soma de `ledger.delta`.
   - `POST /v1/rewards/{id}/redeem` roda em transação no Postgres: **saldo nunca negativo**, decrementa estoque (quando `stock` não for `NULL`) e gera código único de 6 dígitos (validade de 10 min no balcão).
6. **Tom, UX e requisito do sorteio:**
   - Linguagem adulta e regional (Capim Dourado / cerrado): **proibido usar emoji, mascote, avatar, termo "moedinha" ou "parabéns, você subiu de nível"**. *(Exceção cosmética oculta e não persistente: o easter egg de "Sexta-feira 13" do Jason ao clicar 13 vezes em `<RaizLogo />` — `<JasonScareDialog />`, detalhado em [docs/DESIGN.md](./docs/DESIGN.md) e [docs/REGRAS_NEGOCIO.md](./docs/REGRAS_NEGOCIO.md) —, sem emoji e sem efeito em pontos/API.)*
   - Prêmios sempre com nome de benefício real (ex.: *"Café na Casa do Pão"*, *"2h de estacionamento"*).
   - Dados de demonstração (`seed`) devem ser **explicitamente rotulados como demonstração na tela**.
   - **Zero dados mockados no frontend:** todas as telas consomem `/v1/*`; a tela inicial usa uma única chamada (`GET /v1/home`), exibindo skeleton no carregamento e estado de erro com ação *"tentar de novo"* (nunca tela branca).
7. **Ordem de corte se o prazo apertar:** cortar apenas nesta sequência — `ranking → prêmios → missão de categoria → nível`. **Nunca cortar:** escanear cupom, saldo e tela inicial.

---

## 4. Convenções de código

### Idioma do código (obrigatório)

- **Em `apps/api/`: código, identificadores, nomes de tabela e coluna, comentários, logs e mensagens de erro da API em inglês.**
- Copy que o visitante lê (títulos de missão e prêmio, nomes de oferta, termos de resgate) permanece em **pt-BR** — é conteúdo, não código.
- O front traduz `error.code` para pt-BR em `messages.ts`; nunca exibir `error.message` cru na tela.
- Documentação (`docs/`, `entregas/`, README, AGENTS) continua em português.

### Configuração (obrigatório)

- Fonte única em `apps/api/internal/config`: struct com tags `env` + `validate`, e um único `Load()` que valida e **falha no boot**.
- Nenhum `os.Getenv` fora do pacote `config`.
- `DATABASE_URL` e segredos não têm default; `.env` é conveniência de dev (gitignored) e `.env.example` é a documentação versionada.
- `cmd/migrate` e `cmd/seed` usam `LoadDatabaseURL()`: tocar no banco não deve exigir JWT ou configuração de HTTP.
- Middleware de plataforma: usar o que o Chi já entrega (`middleware.Compress`, `CleanPath`, `GetHead`, `NoCache`, `RequestSize`, `Timeout`) e `go-chi/cors`. Não escrever middleware que a lib resolve; `middleware.RealIP` é **proibido** (deprecado por spoofing — use `ClientIPFromXFF` se precisar de IP).

### Contrato HTTP

- **Contrato OpenAPI-First (`docs/openapi.yaml`):**
  - OpenAPI 3.1 versionado e servido em `/docs` (Scalar).
  - Payloads JSON em `snake_case`.
  - Datas e timestamps em **ISO-8601 UTC**.
  - Valores monetários em **centavos (`integer`)** — nunca `float`.
  - Formato padrão de erro: `{ "error": { "code": "...", "message": "...", "details": ... } }`.
  - `Idempotency-Key` suportado/exigido em `POST /v1/receipts`.
  - Listagens com paginação por **cursor** (`/v1/me/ledger`, `/v1/offers`).
- **Backend Go (`apps/api/`):**
  - Go idiomático com roteador **Chi**; sem frameworks pesados.
  - Persistência via `pgx` / `database/sql` + **sqlc** (queries SQL tipadas em compile-time; **proibido ORM**).
  - Migrações SQL versionadas em `apps/api/internal/database/migrations/` com `golang-migrate`.
  - Logs estruturados exclusivamente com `log/slog` (nunca `fmt.Println` em rotas/serviços e nunca logar dados sensíveis).
  - Integrações externas (SEFAZ, WhatsApp, OpenWeather) isoladas com timeout de `2s`, circuit breaker simples e degradação local.
- **Frontend TypeScript (`apps/web/`):**
  - Rotas file-based em `apps/web/src/routes/` (TanStack Router); lógica agrupada por feature em `apps/web/src/features/`.
  - Consumo de dados **somente** via hooks do **TanStack Query** usando o client gerado de `docs/openapi.yaml` (`openapi-typescript` + `openapi-fetch`) — proibido `fetch` ad-hoc com tipos manuais em componentes.
  - Validação de formulários e borda com **Zod**.
  - Estilização com Tailwind CSS + shadcn/ui, mobile-first (respeitar 4G ruim: bundles enxutos, cache e fila offline no scan).
  - Tratar explicitamente `isPending` (skeleton), `isError` (botão de retry) e `refetch` na UI.

---

## 5. Testes e validação

> **Regra inviolável:** nunca afirmar que testes ou builds passaram sem executá-los após a última edição e inspecionar a saída real.

### Comandos esperados (pós-scaffold)

Da raiz do repositório, `make` (sem alvo) lista os atalhos: `make up`, `make api`, `make seed`, `make psql`, `make check`, `make fmt`, `make docs`. O equivalente direto:

- **Banco local:** `docker compose up -d` (Postgres 16), depois `go run ./cmd/migrate` e `go run ./cmd/seed` (ambos idempotentes).
- **Backend (`apps/api/`):**
  - `go test ./...`
  - `go vet ./...`
- **Frontend (`apps/web/`):**
  - `npx vitest run` (ou via script `test` do `package.json`)
  - `npx tsc --noEmit` e `npm run build` (garante que alterações no `openapi.yaml` não quebram o contrato tipado do frontend).

### Escopo de testes e critérios de aceite

- **Escopo do MVP:** testes unitários e de integração focados em **contrato da API e regras de pontos/antifraude**; **não criar suíte E2E** pesada durante o hackathon.
- **Cenários obrigatórios de cobertura:**
  1. Parser da chave NFC-e (44 dígitos válidos/inválidos, módulo 11, extração de CNPJ/UF/emissão).
  2. `POST /v1/receipts`: cupom válido credita em `< 3s`; mesma `access_key` retorna `409` sem duplicar pontos; limites de 1/loja/dia, 5/dia e janela de 72h; CNPJ desconhecido credita 10 sementes sem erro na UI; fallback quando SEFAZ falha ou excede `2s`.
  3. `POST /v1/rewards/{id}/redeem`: transação atômica garante saldo nunca negativo, decremento de estoque e unicidade do código de 6 dígitos.
  4. Missão de 3 lojas conclui **uma única vez** ao atingir 3 CNPJs distintos.
  5. `POST /v1/auth/verify`: sessão/JWT criada em `< 3s`; telefone inválido exibe erro inline.
  6. `DELETE /v1/me`: exclusão/soft delete funcional pela UI.
  7. Saúde da API e contrato vivo: `GET /healthz` (`200`) e `GET /docs` servindo `docs/openapi.yaml`.

---

## 6. Fontes de verdade

### Existentes no repositório

- [docs/CONTEXTO_PROJETO.md](./docs/CONTEXTO_PROJETO.md) — **consulta obrigatória antes de novas implementações**: visão do projeto, stack, decisões arquiteturais tomadas, estado atual (o que já está pronto) e pendências.
- [apps/web/AGENTS.md](./apps/web/AGENTS.md) — **consulta obrigatória ao mexer em `apps/web/`**: organização por feature, UI × hooks, rota fina, HTTP tipado, React Query, formulários, estados de loading/erro e checklist de PR.
- [docs/REGRAS_NEGOCIO.md](./docs/REGRAS_NEGOCIO.md) — **consulta obrigatória antes de novas implementações**: especificação funcional, entidades, fluxos, validações e regras de domínio.
- [entregas/ENTREGA-1.md](./entregas/ENTREGA-1.md) — documento vivo de planejamento inicial com tese do produto, mecânicas, wireframes e critérios das 7 telas, arquitetura, schema, endpoints, consumo de APIs em 3 camadas, plano de execução de 6h, ordem de corte, riscos e LGPD.
- [entregas/ENTREGA-1.pdf](./entregas/ENTREGA-1.pdf) — mesma entrega em PDF (versão de apresentação, com identidade visual e fluxos). **Toda entrega entra no repositório nos dois formatos: `.md` (fonte) e `.pdf` (banca).**
- [docs/referencias/planta-capim-dourado-shopping.pdf](./docs/referencias/planta-capim-dourado-shopping.pdf) — planta do Capim Dourado Shopping (material do parceiro).
- [README.md](./README.md) — visão geral e ponto de entrada do repositório.

### Planejadas no scaffold (conforme `ENTREGA-1.md` §6.3)

- `docs/openapi.yaml` — fonte única de verdade do contrato HTTP entre `apps/api/` e `apps/web/` (e documentação `/docs`).
- `apps/api/internal/database/migrations/` — fonte de verdade do schema relacional, índices e constraints de unicidade no Postgres 16.
- `apps/api/internal/database/seed.sql` — massa padrão de demonstração (5 lojas parceiras, 40 cupons, 12 personas).
- `docker-compose.yml` — configuração do PostgreSQL 16 local.

*(Obs.: `ENTREGA-1.md` §6.3 mostra a árvore-alvo do repositório; o documento vigente fica em `entregas/ENTREGA-1.md`, ao lado do `ENTREGA-1.pdf`.)*

---

## 7. Segurança e limites

### LGPD e privacidade (obrigatório)

- **Minimização:** armazenar apenas **nome** e **telefone**. Proibido coletar localização GPS, contatos ou dados de pagamento.
- **CPF descartado:** o CPF eventualmente presente no cupom/SEFAZ **NUNCA é armazenado** — ler (se existir) e descartar imediatamente; nunca persistir em banco ou registrar em log.
- **Proteção de telefone:** persistir `phone_hash` (para lookup/autenticação) e `phone_enc` (criptografado para exibição). Nunca gravar telefone em claro em logs.
- **Base legal e direitos do titular:** exigir consentimento explícito com `consent_at`; disponibilizar no Perfil os fluxos de **baixar meus dados** e **apagar minha conta** (`DELETE /v1/me`, com `deleted_at` e anonimização prevista em 30 dias); retenção máxima de cupons de 24 meses.
- **Isolamento em relatórios:** `GET /v1/metrics/summary` (para lojista/shopping) deve retornar **somente métricas agregadas**, nunca dados individuais de visitantes.

### Segurança de aplicação e limites para agentes

- **Antifraude por constraint:** unicidade de `receipts.access_key` e `redemptions.code` garantida no banco, não só em memória.
- **Proteção de rotas:** JWT HS256 (30d no MVP), rate limit por telefone e por IP (auth e scan), escopo/chave de API para endpoints de parceiros.
- **Proibições absolutas:**
  - Nunca commitar segredos (chave JWT, chaves de criptografia, tokens WhatsApp/OpenWeather, strings de conexão reais).
  - Nunca expor credenciais de APIs externas no frontend (`apps/web/`).
  - Nunca mockar saldo, prêmios ou endpoints no frontend para "simular" API.
  - Nunca criar coluna `balance` mutável fora do `ledger`.
  - Nunca introduzir serviços descartados no MVP (Redis, brokers de fila, microsserviços, ORM, chatbot).

---

## 8. Fluxo de trabalho

1. **Antes de implementar qualquer tarefa:**
   - Consultar obrigatoriamente [docs/CONTEXTO_PROJETO.md](./docs/CONTEXTO_PROJETO.md) (visão, decisões arquiteturais, estado atual e pendências) e [docs/REGRAS_NEGOCIO.md](./docs/REGRAS_NEGOCIO.md) (entidades, fluxos, validações e regras de domínio).
   - Consultar as seções pertinentes de [entregas/ENTREGA-1.md](./entregas/ENTREGA-1.md) (domínio §2, telas §4, contrato §5.4, cortes §9, fora de escopo §13 e LGPD §11) para detalhes de wireframes e contexto da entrega inicial.
   - Confirmar se a tarefa está dentro do caminho crítico do bloco atual (Infra/Healthz → Auth → Scan/Ledger → Home/Scan/Carteira → Missões/Resgate → Seed/Docs).
2. **Ao alterar domínio, modelo de dados ou API:**
   - Atualizar primeiro o schema/migração (`apps/api/internal/database/migrations/`) e queries `sqlc`, mantendo constraints e ledger íntegros.
   - Atualizar `docs/openapi.yaml` **antes** ou junto da rota em Go, e regenerar os tipos/client do frontend em `apps/web/src/api/` (`openapi-typescript`).
   - Sincronizar imediatamente [docs/REGRAS_NEGOCIO.md](./docs/REGRAS_NEGOCIO.md) sempre que o domínio, o modelo de dados, os fluxos ou as validações mudarem (respeitando a aprovação exigida na seção 3).
   - Garantir que toda chamada externa nova tenha timeout de `2s` e fallback local testado.
3. **Antes de testar ou concluir um bloco:**
   - Rodar `go test ./...`, `go vet ./...`, `npx vitest run` e o build/typecheck do frontend (`npx tsc --noEmit` / `npm run build`).
   - Verificar manualmente o fluxo crítico da demo quando aplicável (entrar → escanear/digitar 44 dígitos → conferir saldo/ledger → concluir missão → resgatar voucher).
   - Manter [docs/CONTEXTO_PROJETO.md](./docs/CONTEXTO_PROJETO.md), [docs/REGRAS_NEGOCIO.md](./docs/REGRAS_NEGOCIO.md) e [entregas/ENTREGA-1.md](./entregas/ENTREGA-1.md) sincronizados ao final de cada bloco de execução sempre que o domínio, o modelo de dados ou o progresso do projeto mudarem.

---

## 9. Skills ou ferramentas aplicáveis

| Procedimento / Contexto | Skill ou Ferramenta | Quando usar / Não usar |
|---|---|---|
| **UI, HTML/CSS, acessibilidade, formulários, dialogs, PWA client-side (`apps/web/`)** | Skill `modern-web-guidance` | **Obrigatório executar antes** de criar ou alterar componentes web (ex.: formulário de telefone/OTP, entrada de 44 dígitos, modais de resgate/LGPD, tabelas de extrato). **Não usar** para backend Go, SQL, Docker ou testes. |
| **Documentação oficial Google / Chrome / Web APIs** | Skill `retrieving-developer-knowledge` | Usar para consultar APIs Web/Chrome (ex.: câmera/`BarcodeDetector`, Service Workers) ou docs oficiais Google. **Não usar** para arquivos locais ou libs não-Google. |
| **Regras e skills do workspace (`.agents/`)** | Skill `agy-customizations` | Usar apenas se for criar/ajustar customizações do Antigravity neste workspace. |
| **Trabalho paralelo independente** | Skill `swarm` | Usar apenas após `docs/openapi.yaml` fechado, caso backend (`apps/api/`) e frontend (`apps/web/`) precisem avançar em paralelo. |
| **Ferramentas CLI do projeto (pós-scaffold)** | `go`, `sqlc`, `golang-migrate`, `docker compose`, `vitest`, `openapi-typescript`, `fly`, `wrangler` | Usar conforme o módulo alterado; após editar `docs/openapi.yaml`, regenerar tipos do front e validar build. |
| **Aviso sobre skill global incompatível** | Skill `testes-backend` *(não aplicável)* | A skill global `testes-backend` (`~/.gemini/config/skills/testes-backend/SKILL.md`) refere-se a **Java 25 / Quarkus** de outro projeto. **Não utilizar** sua stack/estrutura no backend Go do Raiz; manter apenas a regra de executar testes reais antes de reportar sucesso. |
