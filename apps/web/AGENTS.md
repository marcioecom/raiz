# apps/web/AGENTS.md — organização do frontend

Escopo: `apps/web/` (PWA Raiz). Precedência: `../../AGENTS.md` (produto, regras de negócio, stack) > este arquivo (onde o código mora) > preferência pessoal.

Padrão extraído do código real de dois repos do mesmo autor: `echo/apps/web` (TanStack Start + React Query + shadcn) e `waytutor/apps/extension` (WXT + React Query + Tailwind puro). Onde divergem, vale a versão mais recente (waytutor, 2026-11) — o que foi decidido está na seção 11.

---

## 1. Regra de ouro

**Lógica não mora em componente.**

- Componente (`ui/components/`) recebe props e renderiza. Não importa `api`, não sabe o que é `useQuery`, não calcula regra.
- View (`ui/views/`) é a tela: chama os hooks, decide layout, trata `isPending`/`isError`/vazio, recebe o que a rota passou (params/search).
- Hook (`hooks/`) é dono de estado, chamadas HTTP, efeitos e invalidação de cache.
- `api.ts` é o único arquivo que fala HTTP.
- Regra de negócio pura (cálculo, parse, formatação, ordenação) é função exportada no módulo, com teste colocado ao lado.

### Se for X, vai para Y

| Se for… | Vai para | Evidência do padrão |
|---|---|---|
| JSX reutilizável, sem regra, só props | `features/<x>/ui/components/<nome>.tsx` | `echo/.../modules/inbox/ui/components/conversation-list.tsx` |
| Tela inteira montada (hook + layout + loading/erro) | `features/<x>/ui/views/<x>-view.tsx` | `echo/.../modules/inbox/ui/views/inbox-view.tsx` |
| Chamada HTTP / URL / headers / idempotência | `features/<x>/api.ts` | `waytutor/.../modules/summary/api.ts` |
| `useQuery` / `useInfiniteQuery` / `useMutation` | `features/<x>/hooks/use-<entidade>.ts` | `echo/.../modules/inbox/hooks/use-inbox-conversations.ts` |
| Schema Zod + `useForm` + submit | `features/<x>/hooks/use-<nome>-form.ts` | `echo/.../modules/knowledge-base/hooks/use-knowledge-document-form.ts` |
| Schema Zod dos search params da rota | `features/<x>/search.ts` | `echo/.../modules/inbox/search.ts` |
| Tipo de contrato que o schema gerado não cobre | `features/<x>/types.ts` | `echo/.../modules/inbox/types.ts` |
| Cálculo puro (parse de chave, sementes, datas) + teste | `features/<x>/<nome>.ts` e `<nome>.test.ts` | `echo/.../modules/setup/state.ts` + `state.test.ts` |
| Código de erro da API → texto pt-BR | `features/<x>/messages.ts` | `waytutor/.../modules/account/messages.ts` |
| Estado de UI local (abrir modal, passo atual) | dentro do hook que orquestra | `echo/.../modules/channels/hooks/use-channel-connection-wizard.ts` |
| Primitivo de UI (Button, Input, Dialog, Form) | `components/ui/` (shadcn) | `echo/packages/ui/src/components/*` |
| Layout global, barra inferior, FAB de scan | `components/app-shell.tsx` | `echo/.../modules/shell/ui/app-shell.tsx` |
| Texto/toast de erro repetido em várias telas | `components/error-state.tsx` + `messages.ts` | — |

Se depois de responder essa tabela ainda não souber onde colocar, o arquivo é grande demais: quebre.

---

## 2. Árvore alvo de `apps/web/src/`

```
apps/web/
├─ public/
├─ src/
│  ├─ main.tsx                         # QueryClient + RouterProvider + registro do service worker
│  ├─ router.tsx                       # createRouter + defaults de query
│  ├─ routeTree.gen.ts                 # GERADO — nunca editar
│  ├─ styles.css                      # tailwind + tokens (@theme)
│  ├─ api/
│  │  ├─ schema.d.ts                   # GERADO por openapi-typescript — nunca editar
│  │  └─ client.ts                     # openapi-fetch + middleware + ApiError
│  ├─ components/
│  │  ├─ ui/                           # shadcn (button.tsx, input.tsx, form.tsx, sonner.tsx…)
│  │  ├─ app-shell.tsx                 # header + <Outlet/> + barra inferior de 4 itens + FAB scan
│  │  ├─ error-state.tsx               # título + "Tentar de novo" (onRetry)
│  │  └─ empty-state.tsx
│  ├─ features/
│  │  ├─ auth/                         # Entrada + OTP
│  │  ├─ home/                         # Início
│  │  ├─ scan/                         # Scan do cupom (exemplo completo abaixo)
│  │  ├─ wallet/                       # Carteira (saldo + extrato)
│  │  ├─ missions/                     # Missões / Safra
│  │  ├─ rewards/                      # Prêmios / Voucher
│  │  └─ profile/                      # Perfil / LGPD
│  └─ routes/
│     ├─ __root.tsx                    # só <Outlet/>, Toaster, errorComponent
│     ├─ _auth.tsx                     # layout sem guard (centralizado, mobile)
│     ├─ _auth/entrar.tsx
│     ├─ _app.tsx                      # guard + AppShell + pendingComponent
│     ├─ _app/index.tsx                # Início
│     ├─ _app/scan.tsx
│     ├─ _app/carteira.tsx
│     ├─ _app/missoes.tsx
│     ├─ _app/premios.tsx
│     ├─ _app/premios.$rewardId.tsx
│     └─ _app/perfil.tsx
```

Um módulo de exemplo, completo (é o formato que o agente deve copiar):

```
src/features/scan/
├─ api.ts                 # submitReceipt(accessKey, idempotencyKey)
├─ messages.ts            # already_claimed → "Este cupom já foi registrado."
├─ queue.ts               # fila offline pura: enqueue/ack/list (testável)
├─ queue.test.ts
├─ types.ts               # só o que o schema gerado não cobre (item da fila)
├─ hooks/
│  ├─ use-submit-receipt.ts     # mutation + invalidação de home/wallet/missions
│  └─ use-scan-queue.ts         # fila offline + retry + estado da fila
└─ ui/
   ├─ components/
   │  ├─ access-key-input.tsx   # 44 dígitos: máscara, contador, erro inline
   │  └─ scan-result.tsx        # sementes creditadas, aviso de revisão
   └─ views/
      └─ scan-view.tsx          # chama hooks, escolhe câmera/manual, trata os estados
```

Exemplo mínimo de cada arquivo (contratos entre camadas):

```ts
// features/scan/api.ts
import { api, unwrap } from "@/api/client"
export function submitReceipt(input: { accessKey: string; idempotencyKey: string }) {
  return unwrap(api.POST("/v1/receipts", {
    body: { access_key: input.accessKey },
    headers: { "Idempotency-Key": input.idempotencyKey },
  }))
}
```

```ts
// features/scan/hooks/use-submit-receipt.ts
export function useSubmitReceipt() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: submitReceipt,
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: homeKeys.all() }),
      queryClient.invalidateQueries({ queryKey: walletKeys.all() }),
      queryClient.invalidateQueries({ queryKey: missionKeys.all() }),
    ]),
    onError: (error) => toast.error(messageFor(error)),
  })
  return mutation
}
```

```tsx
// features/scan/ui/views/scan-view.tsx
export function ScanView() {
  const submit = useSubmitReceipt()
  // mutation pendente NÃO troca a tela por skeleton: o formulário continua visível
  return (
    <>
      <AccessKeyInput onSubmit={submit.mutate} disabled={submit.isPending} />
      {submit.isError && <InlineError message={messageFor(submit.error)} />}
      {submit.isSuccess && <ScanResult result={submit.data} />}
    </>
  )
}
```

---

## 3. Rota ≠ tela

Arquivo de rota só faz quatro coisas: declara o path, valida search, lê params/context e monta a view. Nunca busca dados, nunca tem `useState`, nunca formata dado.

```tsx
// routes/_app/premios.$rewardId.tsx
export const Route = createFileRoute("/_app/premios/$rewardId")({
  component: RewardPage,
})
function RewardPage() {
  const { rewardId } = Route.useParams()
  return <RewardDetailView rewardId={rewardId} />
}
```

Regras observadas em `echo/apps/web/app/routes/`:

- Guard de sessão no layout, uma vez: `_app.tsx` usa `beforeLoad` + `redirect`, não cada página.
- `validateSearch` recebe o schema Zod do módulo (`features/<x>/search.ts`; no echo, `modules/inbox/search.ts`).
- `head()` (título/meta) vem de `features/<x>/head.ts` quando a rota precisa — no Raiz, título fixo por tela no `__root`/`_app` é suficiente.
- Loading do layout: `pendingComponent` com skeleton na forma do conteúdo.
- `errorComponent` e `notFoundComponent` no `__root.tsx`.
- Rota com filho layout (`_app/premios.tsx` + `_app/premios.$rewardId.tsx`): o pai só devolve `<Outlet />`.
- Nunca importar `features/<x>/api` na rota.

Mapa das 7 telas:

| Tela | Rota | Feature | View |
|---|---|---|---|
| Entrada/OTP | `_auth/entrar.tsx` | `auth` | `login-view.tsx` (`?passo=telefone\|codigo`) |
| Início | `_app/index.tsx` | `home` | `home-view.tsx` |
| Scan | `_app/scan.tsx` | `scan` | `scan-view.tsx` |
| Carteira | `_app/carteira.tsx` | `wallet` | `wallet-view.tsx` |
| Missões/Safra | `_app/missoes.tsx` | `missions` | `missions-view.tsx` |
| Prêmios/Voucher | `_app/premios.tsx`, `_app/premios.$rewardId.tsx` | `rewards` | `rewards-view.tsx`, `reward-detail-view.tsx` |
| Perfil/LGPD | `_app/perfil.tsx` | `profile` | `profile-view.tsx` |

---

## 4. HTTP: um cliente, erros tipados

- `src/api/client.ts` instancia **`openapi-fetch`** com `schema.d.ts` gerado de `../../docs/openapi.yaml`. Nenhum `fetch` solto em feature, view ou hook.
- `schema.d.ts` é gerado, nunca editado: `npx openapi-typescript ../../docs/openapi.yaml -o src/api/schema.d.ts` (script `npm run api:types`). Rode sempre que o contrato mudar — o `build` falha se o tipo não existir.
- Middleware do cliente: `baseUrl` de `import.meta.env.VITE_API_URL`, `Authorization: Bearer <token>` quando houver sessão (token isolado em `src/api/token.ts`, `localStorage`), e conversão de `{ error: { code, message } }` em `ApiError`. Sem cookie, sem `credentials: "include"` — a autenticação é JWT.
- `unwrap()` recebe `{ data, error }` do openapi-fetch e **lança** `ApiError` — assim React Query trata erro como erro e `refetch()` funciona.

```ts
// src/api/client.ts
export class ApiError extends Error {
  constructor(readonly code: string, readonly status: number) { super(code) }
}
export async function unwrap<T>(result: { data?: T; error?: unknown; response: Response }): Promise<T> {
  if (result.error) {
    const body = result.error as { error?: { code?: string } }
    throw new ApiError(body.error?.code ?? "unknown_error", result.response.status)
  }
  return result.data as T
}
```

- A feature traduz o código em texto com `features/<x>/messages.ts` (`messageFor(error)`), nunca `error.message` cru na tela.
- Códigos são snake_case vindos da API (`already_claimed`, `daily_limit_reached`, `receipt_too_old`). O front não inventa código: se falta, o problema é no contrato.
- `POST /v1/receipts` exige `Idempotency-Key`: gerar `crypto.randomUUID()` no hook, guardar junto do item na fila offline, reenviar a mesma chave ao tentar de novo.
- Chamada externa nunca é feita do front (SEFAZ, WhatsApp, clima são do backend). O front só fala com `/v1/*`.

---

## 5. React Query

Defaults em `src/router.tsx` (não repetir em cada hook):

```ts
new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: false } } })
```

- `retry: false` é intencional: erro vira estado com botão "Tentar de novo" — a regra dura do projeto — em vez de retry silencioso. Polling, quando necessário (ex.: status de voucher ainda pendente), é `refetchInterval` com comentário de uma linha explicando por quê.
- **Query keys por feature, em factory exportada** no arquivo que possui a query. Isso permite invalidar em bloco e é o que sustenta invalidação entre telas:

```ts
export const walletKeys = {
  all: () => ["wallet"] as const,
  ledger: (cursor: string | null) => [...walletKeys.all(), "ledger", cursor ?? "first"] as const,
}
```

- Listagens paginadas usam cursor: `useInfiniteQuery` com `initialPageParam: null` e `getNextPageParam: (page) => page.nextCursor`.
- Invalidação é sempre `onSettled`/`onSuccess` do mutation que muda o recurso, nas keys do módulo **e** nas telas que mostram agregado (`scan` → `home`, `wallet`, `missions`, `profile`).
- `enabled` só quando o parâmetro é opcional (`id !== null`), nunca para “desligar” query de tela que precisa de dado.
- **Optimistic update é exceção, não padrão.** Nos repos do autor ele não aparece em mutation (`echo`: zero; `waytutor`: só espelha storage local). No Raiz existe **um** caso: o débito de sementes no resgate — valor local, reversível, com rollback em `onError`. O **código do voucher, a confirmação e o estoque nunca são inventados no front**: nascem no servidor, e o botão fica `disabled`/`isPending` até a resposta. Em todo o resto: `isPending` + invalidação em `onSettled`.
- Estado global: nenhum. Server state = React Query; estado de UI = `useState` dentro do hook; persistência (fila offline, preferências) atrás de um módulo puro (`queue.ts`) com teste. Sem zustand, sem Context para dado de servidor, sem Redux.
- Derivado não se armazena: calcular no render ou em função pura (`echo/.../modules/setup/state.ts`). `useEffect` que só copia estado para estado é bug.

---

## 6. Formulários e validação

- `react-hook-form` + `zodResolver` + `zod`, com os primitivos `Form/FormField/FormItem/FormControl/FormLabel/FormMessage` de `components/ui/form.tsx` (shadcn). `Controller` manual só para input sem `register` natural.
- O schema e o `useForm` moram no hook (`hooks/use-<nome>-form.ts`), nunca no `.tsx`. O hook devolve `{ form, mutation }` (ou `{ form, onSubmit }`).
- Mensagem de erro de validação é texto curto em pt-BR no `z.string().min(1, "Digite os 44 dígitos.")`. Só o `message` mostrado ao usuário; nada de chave i18n (o produto é pt-BR único).
- Botão de submit: `disabled={form.formState.isSubmitting || mutation.isPending}` e texto trocado (“Enviando…”). Erro de API vai inline quando é do formulário, `toast.error` quando é de ação.
- Validação de borda duplicada onde o dado entra cru: chave de 44 dígitos é validada **no front** (formato + módulo 11, para resposta instantânea) **e** no backend. O front nunca é a autoridade.

---

## 7. Loading, erro e vazio (obrigatório)

Toda query tem quatro estados tratados explicitamente. Nenhuma tela pode renderizar branco.

| Estado | O que a UI faz |
|---|---|
| `isPending` inicial | skeleton na forma do conteúdo real (`ScanSkeleton`, lista de 5 linhas), com `role="status"` e `aria-label` do carregamento. Nunca spinner solto em lista. |
| refetch em background | mantém o conteúdo atual; nada de skeleton, nada de tela cinza |
| `isError` sem dado | bloco de erro + botão “Tentar de novo” chamando `refetch()` |
| `isError` com dado em cache | banner pequeno no topo (“Sem conexão. Mostrando o que já foi salvo.”) + retry, mantendo a lista |
| lista vazia | empty state explicando o motivo e a ação (“Nenhum cupom ainda — escaneie o QR do cupom”) |
| mutation pendente | botão desabilitado com texto de progresso; conteúdo antigo continua visível |

Skeleton e spinner são os de `components/ui` ou `components/`; não criar terceiro padrão.

---

## 8. Convenções de código

**Nomes** (observado nos dois repos):

- pastas e arquivos: `kebab-case` (`rewards`, `use-submit-receipt.ts`, `access-key-input.tsx`)
- views: `<feature>-view.tsx` → `export function ScanView`
- hooks: `use-*.ts` → `export function useSubmitReceipt`
- api: `api.ts` no módulo; tipos: `types.ts`; textos: `messages.ts`; puro: `<nome>.ts`
- componentes exportados em `PascalCase`, **named export**, sem `default`

**Imports**:

- alias `@/` = `src/` (configurado em `tsconfig.json` + `vite.config.ts`); nada de `../../../`.
- dentro da feature, import relativo (`../hooks/use-submit-receipt`, `./scan-result`); fora dela, sempre `@/features/<x>/...`.
- **sem barrel files**: proibido `index.ts`/`index.tsx` de reexport (o único `index.tsx` permitido é rota).
- ordem dos imports pelo Prettier (`@ianvs/prettier-plugin-sort-imports`): tipos, node, terceiros, `@/`, relativos. Não ordenar à mão.
- `import type` para tipo; `verbatimModuleSyntax` ligado.

**Limites entre features**:

- Público de uma feature = `hooks/*` (e `types.ts`). `api.ts` é privado.
- Importar hook de outra feature é permitido (`echo`: `modules/setup/hooks/use-setup-state.ts` compõe `channels` + `knowledge-base`).
- Importar View/componente de outra feature é permitido para compor tela (`inbox-view` usa `setup/ui/components/*`).
- Nenhuma feature importa `api.ts` de outra; para invalidar cache alheio, importe a factory de keys exportada pelo dono da query.
- Regra de negócio compartilhada sobe para `src/lib/` só quando duas features realmente usam.

**Arquivo com mais de ~200 linhas** é duas responsabilidades: quebre em componentes menores (padrão declarado do autor; arquivos maiores que isso nos repos antigos são dívida, não exemplo).

**Estilos**: Tailwind mobile-first, tokens em `styles.css` (`@theme`), `cn()` para condicional, `cva` para variantes. Proibido `style={{}}` com valor que existe como token, proibido CSS module novo. shadcn entra por `pnpm dlx shadcn@latest add <componente>` em `components/ui/` — não escrever componente de registry à mão.

---

## 9. Anti-padrões

```tsx
// ERRADO — HTTP no componente
function Wallet() {
  const [data, setData] = useState()
  useEffect(() => { fetch("/v1/me/ledger").then(r => r.json()).then(setData) }, [])
  return <p>{data?.balance}</p>
}
// CERTO — hook
function WalletView() {
  const ledger = useLedger()
  if (ledger.isPending) return <LedgerSkeleton />
  if (ledger.isError) return <ErrorState onRetry={ledger.refetch} />
  return <LedgerList entries={ledger.data.pages.flatMap(p => p.items)} />
}
```

```tsx
// ERRADO — componente decide regra
<Badge>{seeds >= 500 ? "Raiz" : "Semente"}</Badge>
// CERTO — função pura no módulo, testada
<Badge>{levelLabel(seeds)}</Badge>
```

```ts
// ERRADO — key solta, invalidação que não pega nada
useQuery({ queryKey: ["wallet"] })
queryClient.invalidateQueries({ queryKey: ["ledger"] })
// CERTO
useQuery({ queryKey: walletKeys.ledger(cursor) })
queryClient.invalidateQueries({ queryKey: walletKeys.all() })
```

```ts
// ERRADO — tela branca / erro engolido
if (query.isError) return null
// CERTO
if (query.isError) return <ErrorState onRetry={query.refetch} />
```

```tsx
// ERRADO — lista fixa no front (proibido no projeto)
const REWARDS = [{ id: 1, title: "Café na Casa do Pão" }]
// CERTO — sempre da API
const rewards = useRewards()
```

```ts
// ERRADO — tipo reescrito à mão ao lado do schema gerado
type Receipt = { access_key: string; points_awarded: number }
// CERTO
import type { components } from "@/api/schema"
type Receipt = components["schemas"]["ReceiptResult"]
```

```tsx
// ERRADO — view com 300 linhas e 8 useState
// CERTO — view monta; estado e efeitos vivem em hooks/use-<coisa>.ts
```

```ts
// ERRADO — optimistic que inventa o que só o servidor sabe (código do voucher)
onMutate: () => queryClient.setQueryData(keys.detail(id), { code: "000000" })
// CERTO — debita sementes com rollback; o voucher só existe após a resposta
onMutate: async () => {
  await queryClient.cancelQueries({ queryKey: rewardsKeys.all() })
  const previous = queryClient.getQueryData(rewardsKeys.all())
  queryClient.setQueryData(rewardsKeys.all(), debitLocally)
  return { previous }
},
onError: (_err, _vars, ctx) => queryClient.setQueryData(rewardsKeys.all(), ctx?.previous)
```

---

## 10. Testes, lint e verificação

- `npx tsc --noEmit` e `npm run build` devem passar (o build valida que `schema.d.ts` está em sincronia com o contrato).
- `npx vitest run` para os testes colocados: cada arquivo puro com regra (`queue.ts`, `search.ts`, `messages.ts`, parser de chave) tem `<nome>.test.ts` ao lado. Sem suíte de componente; sem E2E.
- Teste que importa React precisa de `environment: "jsdom"` no `vitest.config.ts`; o resto roda em `node`.
- Lint/format: ESLint (`eslint.config.js`) + Prettier. Não commitar `routeTree.gen.ts` formatado à mão nem `schema.d.ts` editado.

### Checklist de PR (auto-verificação antes de dizer "pronto")

1. [ ] Nenhum `fetch` fora de `src/api/client.ts` e `features/*/api.ts`.
2. [ ] Nenhum `useQuery`/`useMutation` fora de `features/*/hooks/`.
3. [ ] Nenhum componente em `ui/components/` importa `api` ou hook de dados — só props.
4. [ ] Arquivo de rota só lê params/search e monta a view.
5. [ ] Toda query da tela trata `isPending` (skeleton), `isError` (retry) e vazio.
6. [ ] Toda mutation invalida as keys afetadas (inclusive as de outras telas).
7. [ ] Nenhum dado fixo/mockado no front; toda lista vem de `/v1/*`.
8. [ ] Nenhuma coluna/tipo de saldo duplicado à mão: tipo vem de `schema.d.ts`.
9. [ ] Erro de API exibido via `messages.ts` (`messageFor`), com fallback genérico.
10. [ ] Arquivos novos em kebab-case, exports nomeados, sem `index.ts`.
11. [ ] `tsc --noEmit`, `vitest run` e `npm run build` executados — saída real conferida.
12. [ ] Nenhum `any`, nenhum `useEffect` que só copia estado, nenhum arquivo > 200 linhas.

---

## 11. Divergências entre echo e waytutor (o que foi decidido)

| Tema | echo | waytutor | Decisão aqui |
|---|---|---|---|
| Pasta dos módulos | `apps/web/modules/<x>` | `apps/extension/modules/<x>` | `src/features/<x>` (já fixado no AGENTS raiz do Raiz) |
| UI | `ui/components` + `ui/views` | `ui/` plano, arquivos `*-view.tsx` | `ui/components` + `ui/views` (echo; mais explícito) |
| `api.ts` | dentro de `hooks/` | na raiz do módulo | raiz da feature (waytutor; não é hook) |
| Tipos | `types.ts` no módulo | `z.infer` colocado no arquivo do schema | `types.ts` só para o que o `schema.d.ts` não cobre |
| Texto de erro | chave i18n traduzida | `messages.ts` código→pt-BR | `messages.ts` (waytutor; produto pt-BR único) |
| Keys | factory `xQueryKeys` | array literal | factory (echo; necessária para invalidação entre telas) |
| Estado local | `setQueryData` só em auth/org | `setQueryData` para espelhar storage | optimistic só no débito do resgate (com rollback); voucher sempre do servidor |
| `"use client"` | presente (SSR) | ausente | **não usar** — o Raiz é SPA Vite, não TanStack Start |
| Cliente HTTP | wrapper de `fetch` por módulo | wrapper + `modules/api/{config,errors}` | `openapi-fetch` central + `ApiError` (stack do Raiz) |
| Estilo base | shadcn em `packages/ui` | componentes próprios + `@theme` | shadcn em `src/components/ui` + tokens em `styles.css` |
| Testes de rota | testes que leem o fonte com regex | testes de lógica pura | só lógica pura |

---

## 12. Referências (código lido, para conferir quando houver dúvida)

- `echo/apps/web/app/routes/_dashboard/inbox.$conversationId.tsx` — rota fina.
- `echo/apps/web/modules/inbox/ui/views/inbox-view.tsx` — view que compõe hooks e trata estados.
- `echo/apps/web/modules/inbox/hooks/use-inbox-conversations.ts` — keys + `useInfiniteQuery`.
- `echo/apps/web/modules/knowledge-base/hooks/use-knowledge-document-form.ts` — form + zod + mutation.
- `echo/apps/web/modules/setup/state.ts` — regra pura fora do componente, com teste.
- `waytutor/apps/extension/modules/summary/{api.ts,hooks/use-summary.ts,ui/summary-view.tsx}` — o corte api → hook → view em 3 arquivos.
- `waytutor/apps/extension/modules/account/messages.ts` — código de erro para pt-BR.
- `waytutor/apps/extension/entrypoints/sidepanel/app.tsx` — `isPending`/`isError`/vazio no topo da árvore.
