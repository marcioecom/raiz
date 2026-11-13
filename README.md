# Raiz — HackaRun 2026

**Desafio 05:** engajamento e fidelização dos visitantes · Capim Dourado Shopping (Palmas-TO)

O shopping sabe quantas pessoas passaram no mês. Não sabe quem voltou. O **Raiz** transforma o QR Code da NFC-e — que já está no cupom do visitante — em vínculo: sementes, missões entre lojas e recompensa na mesma visita. Sem instalar app, sem mexer no caixa da loja.

**Stack:** React + TypeScript (TanStack Router/Query) · Go · PostgreSQL
**Item sorteado:** consumo de APIs (UI 100% servida por API REST tipada)

## Entregas

Cada entrega vive em [`entregas/`](./entregas) nos dois formatos: `.md` (fonte, versionável) e `.pdf` (versão para banca, renderiza no GitHub).

| Entrega | Markdown | PDF |
|---|---|---|
| 1 — Planejamento técnico inicial | [ENTREGA-1.md](./entregas/ENTREGA-1.md) | [ENTREGA-1.pdf](./entregas/ENTREGA-1.pdf) |

Contém: proposta, personas, estrutura das 7 telas, arquitetura, stack, contrato da API, como o sorteio é incorporado, métricas, plano das 6 horas, riscos e LGPD.

## Rodando a API

```bash
docker compose up -d                      # PostgreSQL 16

cd apps/api
cp .env.example .env                      # na primeira vez (JWT_SECRET é obrigatório)
go run ./cmd/api                          # aplica as migrações no boot

curl localhost:8080/healthz               # saúde (503 se o banco cair)
open http://localhost:8080/docs           # contrato interativo (Scalar)

go run ./cmd/seed                         # massa de demonstração (idempotente)
go run ./cmd/migrate                      # só as migrações
go test ./...
```

- Contrato: [`docs/openapi.yaml`](./docs/openapi.yaml) — fonte única do client tipado do front.
- Front: [`apps/web/AGENTS.md`](./apps/web/AGENTS.md) — padrão de organização que o frontend deve seguir.

## Documentação de apoio

- [docs/CONTEXTO_PROJETO.md](./docs/CONTEXTO_PROJETO.md) — visão, stack, decisões arquiteturais, estado atual e pendências
- [docs/REGRAS_NEGOCIO.md](./docs/REGRAS_NEGOCIO.md) — entidades, fluxos, validações e regras de domínio
- [docs/referencias/planta-capim-dourado-shopping.pdf](./docs/referencias/planta-capim-dourado-shopping.pdf) — planta do Capim Dourado Shopping
- [AGENTS.md](./AGENTS.md) — guia operacional para agentes
- [apps/web/AGENTS.md](./apps/web/AGENTS.md) — organização do frontend (módulos, UI × hooks)
