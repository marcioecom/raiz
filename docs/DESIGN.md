---
name: Raiz Capim Dourado
description: Design system normativo e padrão visual do PWA Raiz ("quem volta, cria raiz") para o Capim Dourado Shopping em Palmas-TO, com estética tátil Cerrado/Papel e contrato subordinado a docs/openapi.yaml.
colors:
  canvas: '#FAF8F3'
  sand: '#F2EDE2'
  card: '#FFFFFF'
  border: '#E2DACB'
  control-border: '#7D7463'
  primary-forest: '#1F3A2E'
  on-primary: '#FAF8F3'
  primary-ink: '#16241D'
  secondary-ink: '#53665B'
  gold-accent: '#C8963E'
  on-gold: '#16241D'
  gold-text-light: '#7D5512'
  gold-soft: '#F7EEDB'
  error: '#B33A2E'
  error-soft: '#FAEBE9'
  success: '#1E643D'
  success-soft: '#E6F2EB'
  warning: '#7D5512'
  warning-soft: '#FDF3DF'
  demo: '#334E68'
  demo-soft: '#ECF1F5'
  demo-border: '#9FB3C8'
typography:
  display-balance:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  editorial-accent:
    fontFamily: Instrument Serif
    fontSize: 22px
    fontWeight: '400'
    lineHeight: 28px
  voucher-code:
    fontFamily: JetBrains Mono, ui-monospace, monospace
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: 0.15em
  mono-data:
    fontFamily: JetBrains Mono, ui-monospace, monospace
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  h1-screen:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
    letterSpacing: -0.015em
  h2-section:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-base:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  input-text:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  caption-meta:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  label-section:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.06em
rounded:
  sm: 0.25rem
  md: 0.5rem
  control: 0.75rem
  card: 1rem
  sheet: 1.5rem
  full: 9999px
spacing:
  xs: 0.25rem
  sm: 0.5rem
  md: 1rem
  lg: 1.5rem
  xl: 2rem
  gutter: 1rem
  container-max: 28rem
  desktop-sidebar: 16rem
  desktop-content-max: 70rem
  desktop-frame-max: 90rem
  touch-min: 2.75rem
  scan-fab: 3.5rem
components:
  button-primary:
    background: '{colors.primary-forest}'
    color: '{colors.on-primary}'
    borderRadius: '{rounded.control}'
    minHeight: 48px
  button-secondary:
    background: '{colors.card}'
    color: '{colors.primary-ink}'
    borderColor: '{colors.border}'
    borderRadius: '{rounded.control}'
    minHeight: 44px
  button-destructive:
    background: '{colors.canvas}'
    color: '{colors.error}'
    borderColor: '{colors.error}'
    hoverBackground: '{colors.error-soft}'
    borderRadius: '{rounded.control}'
    minHeight: 44px
  scan-fab:
    background: '{colors.primary-forest}'
    color: '{colors.on-primary}'
    borderColor: '{colors.gold-accent}'
    borderRadius: '{rounded.full}'
    size: 56px
  input-field:
    background: '{colors.card}'
    color: '{colors.primary-ink}'
    borderColor: '{colors.control-border}'
    focusBorderColor: '{colors.primary-forest}'
    errorBorderColor: '{colors.error}'
    errorBackground: '{colors.error-soft}'
    borderRadius: '{rounded.control}'
    minHeight: 48px
    fontSize: 16px
  card-surface:
    background: '{colors.card}'
    borderColor: '{colors.border}'
    borderRadius: '{rounded.card}'
  card-hero:
    background: '{colors.primary-forest}'
    color: '{colors.on-primary}'
    accent: '{colors.gold-accent}'
    borderRadius: '{rounded.card}'
  card-sand:
    background: '{colors.sand}'
    borderColor: '{colors.border}'
    borderRadius: '{rounded.card}'
  badge-gold:
    background: '{colors.gold-soft}'
    color: '{colors.gold-text-light}'
    borderColor: '{colors.border}'
    borderRadius: '{rounded.full}'
  badge-demo:
    background: '{colors.demo-soft}'
    color: '{colors.demo}'
    borderColor: '{colors.demo-border}'
    borderRadius: '{rounded.md}'
  badge-success:
    background: '{colors.success-soft}'
    color: '{colors.success}'
    borderRadius: '{rounded.full}'
  badge-warning:
    background: '{colors.warning-soft}'
    color: '{colors.warning}'
    borderRadius: '{rounded.full}'
  badge-error:
    background: '{colors.error-soft}'
    color: '{colors.error}'
    borderRadius: '{rounded.full}'
  dialog-modal:
    background: '{colors.card}'
    borderColor: '{colors.border}'
    borderRadius: '{rounded.card}'
  bottom-bar:
    background: '{colors.card}'
    borderColor: '{colors.border}'
    activeColor: '{colors.primary-forest}'
    inactiveColor: '{colors.secondary-ink}'
---

# DESIGN.md — Raiz (Capim Dourado Shopping · Palmas-TO)

## Overview

O **Raiz** (*"quem volta, cria raiz"*) é um PWA mobile-first sem instalação criado para visitantes do **Capim Dourado Shopping** (Palmas-TO). A identidade visual reflete o cerrado tocantinense e o artesanato em capim dourado: papel quente, verde-floresta profundo, tipografia direta e rigor numérico de livro-caixa.

- **Modo de aparência:** exclusivamente claro (`LIGHT`). Não há tema escuro no MVP.
- **Princípio de soberania:** o contrato HTTP em [openapi.yaml](./openapi.yaml) e as invariantes em [REGRAS_NEGOCIO.md](./REGRAS_NEGOCIO.md) prevalecem sobre qualquer detalhe gerado nas telas de referência do Stitch.
- **Organização técnica:** a implementação segue estritamente a separação `rota → view → hook → api` descrita em [apps/web/AGENTS.md](../apps/web/AGENTS.md), com tokens declarados em `apps/web/src/styles.css` (`@theme`) e primitivos em `apps/web/src/components/ui/`.

### Mapeamento das 11 Telas de Referência para Rotas TanStack Router

As 11 telas desenhadas para o fluxo completo do visitante consolidam-se nas 7 rotas file-based em `apps/web/src/routes/`:

| Tela no fluxo | Rota TanStack Router (`apps/web/src/routes/`) | View (`apps/web/src/features/*/ui/views/`) | Contrato `openapi.yaml` | Bottom Bar |
|---|---|---|---|---|
| **1A · Entrada (Nome e Telefone)** | `_auth/entrar.tsx` (`?passo=telefone`) | `auth/ui/views/login-view.tsx` | `POST /v1/auth/otp` | Oculta |
| **1B · Confirmação OTP e LGPD** | `_auth/entrar.tsx` (`?passo=codigo`) | `auth/ui/views/login-view.tsx` | `POST /v1/auth/verify` | Oculta |
| **2 · Início ("Hoje no Capim")** | `_app/index.tsx` (`/`) | `home/ui/views/home-view.tsx` | `GET /v1/home` | Visível (`Início`) |
| **3A · Escanear QR (Câmera)** | `_app/scan.tsx` (`/scan`, modo `camera`) | `scan/ui/views/scan-view.tsx` | `POST /v1/receipts` | Oculta |
| **3B · Digitar 44 Dígitos (Manual)** | `_app/scan.tsx` (`/scan`, modo `manual` obrigatório) | `scan/ui/views/scan-view.tsx` | `POST /v1/receipts` | Oculta |
| **3C · Confirmação de Cupom** | `_app/scan.tsx` (estado `isSuccess` / fila offline) | `scan/ui/views/scan-view.tsx` | `ReceiptResult` (`POST /v1/receipts`) | Oculta |
| **4 · Carteira, Ritmo e Extrato** | `_app/carteira.tsx` (`/carteira`) | `wallet/ui/views/wallet-view.tsx` | `GET /v1/me` + `GET /v1/me/ledger` | Visível (`Carteira`) |
| **5 · Missões e Safra** | `_app/missoes.tsx` (`/missoes`) | `missions/ui/views/missions-view.tsx` | `GET /v1/missions` + `GET /v1/leaderboard` | Visível (`Missões`) |
| **6A · Catálogo de Prêmios** | `_app/premios.tsx` (`/premios`) | `rewards/ui/views/rewards-view.tsx` | `GET /v1/rewards` | Visível |
| **6B · Voucher Ativo de Balcão** | `_app/premios.$rewardId.tsx` (ou `<dialog>` modal) | `rewards/ui/views/reward-detail-view.tsx` | `Redemption` (`POST /v1/rewards/{id}/redeem`) | Oculta |
| **7 · Perfil, Níveis e LGPD** | `_app/perfil.tsx` (`/perfil`) | `profile/ui/views/profile-view.tsx` | `GET /v1/me`, `GET /v1/me/ledger`, `DELETE /v1/me` | Visível (`Perfil`) |

> **Nota sobre contingência (ordem de corte):** em caso de corte de escopo (`ranking → prêmios → missão de categoria → nível`), as rotas `/`, `/scan` e `/carteira` jamais podem ser removidas nem perder acesso pela Bottom Bar ou pelos atalhos da Home.

---

## Colors

Toda a interface utiliza exclusivamente a **Paleta Cerrado/Papel**. As variações em verde-menta geradas automaticamente por ferramentas de tema dinâmico Material **são estritamente proibidas**.

### Paleta Normativa Cerrado/Papel

| Token | Hex | Uso normativo |
|---|---|---|
| `canvas` | `#FAF8F3` | Fundo principal das telas (papel quente). |
| `sand` | `#F2EDE2` | Fundo externo no desktop, cards secundários, controles segmentados e caixas de apoio. |
| `card` | `#FFFFFF` | Superfície de cards primários, inputs, Bottom Bar e `<dialog>`. |
| `border` | `#E2DACB` | Bordas estruturais de `1px`, divisórias internas e trilho de barras de progresso. |
| `control-border` | `#7D7463` | Borda de inputs em repouso e controles de formulário (contraste de UI `>= 3:1`). |
| `primary-forest` | `#1F3A2E` | Ações primárias, card herói de saldo, marca wordmark `RAIZ`, estado ativo da navegação e foco. |
| `on-primary` | `#FAF8F3` | Texto e ícones sobre `primary-forest` (`#1F3A2E`). |
| `primary-ink` | `#16241D` | Texto principal, títulos, números de saldo, texto sobre `gold-accent` e módulos do QR Code. |
| `secondary-ink` | `#53665B` | Subtítulos, metadados, rótulos de seção e itens inativos da Bottom Bar. |
| `gold-accent` | `#C8963E` | Preenchimento de barras de progresso, colmo superior do SVG `RaizLogo`, aro do botão `Escanear` e fundo de badge de destaque com texto `#16241D`. |
| `on-gold` | `#16241D` | Único texto permitido sobre superfície `#C8963E`. |
| `gold-text-light` | `#7D5512` | Texto e números dourados sobre fundos claros (`#FAF8F3`, `#FFFFFF`, `#F2EDE2`, `#F7EEDB`). |
| `gold-soft` | `#F7EEDB` | Fundo suave de badges de recompensa, nível e destaque da posição do usuário no ranking. |
| `error` / `error-soft` | `#B33A2E` / `#FAEBE9` | Mensagens de erro inline, borda `:user-invalid` e ações destrutivas (ex.: exclusão LGPD). |
| `success` / `success-soft` | `#1E643D` / `#E6F2EB` | Confirmação de cupom, créditos positivos no extrato (`+58`) e status `Ativo` do voucher. |
| `warning` / `warning-soft` | `#7D5512` / `#FDF3DF` | Avisos calmos de fila offline e cronômetro de 10 minutos do voucher. |
| `demo` / `demo-soft` / `demo-border` | `#334E68` / `#ECF1F5` / `#9FB3C8` | Rótulo explícito `Demonstração` para dados de seed e aviso do OTP `000000`. |

### Tokens Proibidos (Reconciliação contra autogeração Material do Stitch)

Os seguintes valores hexadecimais autogerados nos protótipos HTML do Stitch **estão banidos** de `apps/web/`:

- Superfícies Material light-green: `#edfdf2`, `#e1f2e6`, `#e7f8ec`, `#dcece1`, `#d6e7db`, `#cdded3`, `#cbead8`, `#afcebd`.
- Primárias e tintas Material genéricas: `#082419`, `#101e18`, `#424844`, `#c2c8c2`, `#727974`, `#486457`, `#25332c`, `#e4f5e9`.
- Secundárias, terciárias e erro padrão Material: `#7e5700`, `#fdc668`, `#765100`, `#ba1a1a`, `#ffdad6`, `#93000a`, `#ffdead`, `#ffddb3`.
- Cinzas de baixo contraste usados pontualmente em rodapés/abas do Stitch: `#8C9E94`, `#7A8B80`.

### Regras de Contraste (WCAG 2.1)

1. **Proibição de `#C8963E` como texto em fundo claro:** sobre `#FAF8F3` e `#FFFFFF`, `#C8963E` atinge apenas `2.51:1` e `2.66:1`, falhando o mínimo WCAG AA (`4.5:1`). Sempre que um número, valor de sementes ou rótulo âmbar aparecer em fundo claro, usar **`#7D5512`** (`6.22:1` em `#FAF8F3`, `6.60:1` em `#FFFFFF`, `5.73:1` em `#F7EEDB`).
2. **Proibição de texto branco ou `#FAF8F3` sobre `#C8963E`:** `#FAF8F3` sobre `#C8963E` resulta em `2.51:1`. Sempre usar `#16241D` (`6.05:1`) sobre `#C8963E`.
3. **Proibição de `#7D7463` como texto:** sobre `#FAF8F3`, `#7D7463` atinge `4.35:1` (abaixo de `4.5:1` para texto normal). Usar `#7D7463` apenas em bordas de controle (`4.35:1`–`4.62:1`, acima de `3:1` para componentes de UI); para textos secundários e rodapés, usar sempre **`#53665B`** (`5.79:1` em `#FAF8F3`, `6.14:1` em `#FFFFFF`, `5.26:1` em `#F2EDE2`).
4. **Razões de contraste verificadas dos pares normativos:**
   - `#16241D` sobre `#FAF8F3` (`15.17:1`), `#FFFFFF` (`16.10:1`), `#F2EDE2` (`13.79:1`).
   - `#FAF8F3` sobre `#1F3A2E` (`11.62:1`); `#C8963E` sobre `#1F3A2E` (`4.63:1`).
   - `#B33A2E` sobre `#FAF8F3` (`5.56:1`) e sobre `#FAEBE9` (`5.09:1`).
   - `#1E643D` sobre `#E6F2EB` (`6.20:1`) e sobre `#FFFFFF` (`7.13:1`).
   - `#334E68` sobre `#ECF1F5` (`7.60:1`).
5. **QR Code de balcão:** desenhar módulos em `#16241D` sobre fundo `#FFFFFF` (`16.10:1`) para leitura óptica confiável sob iluminação de balcão.

### Referência de Tokens `@theme` (`apps/web/src/styles.css`)

```css
@theme {
  --color-canvas: #FAF8F3;
  --color-sand: #F2EDE2;
  --color-card: #FFFFFF;
  --color-border: #E2DACB;
  --color-control-border: #7D7463;
  --color-forest: #1F3A2E;
  --color-on-forest: #FAF8F3;
  --color-ink: #16241D;
  --color-ink-muted: #53665B;
  --color-gold: #C8963E;
  --color-gold-text: #7D5512;
  --color-gold-soft: #F7EEDB;
  --color-error: #B33A2E;
  --color-error-soft: #FAEBE9;
  --color-success: #1E643D;
  --color-success-soft: #E6F2EB;
  --color-warning: #7D5512;
  --color-warning-soft: #FDF3DF;
  --color-demo: #334E68;
  --color-demo-soft: #ECF1F5;
  --color-demo-border: #9FB3C8;

  --font-sans: "Plus Jakarta Sans", system-ui, sans-serif;
  --font-serif: "Instrument Serif", Georgia, serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
}
```

---

## Typography

### Famílias Tipográficas

1. **Plus Jakarta Sans** (`400`, `500`, `600`, `700`): fonte principal para títulos, navegação, corpo de texto, rótulos e botões.
2. **Instrument Serif** (`400`, uso editorial pontual): aplicada exclusivamente em frases curtas de marca ou assinatura de campanha (por exemplo, o lema *"Quem volta, cria raiz."* na entrada ou título editorial da Safra). Proibida em formulários, botões, saldos, extratos ou tabelas.
3. **JetBrains Mono** (`500`, `700`): obrigatória para dados técnicos e códigos verificáveis — chave de 44 dígitos da NFC-e (agrupada em 11 blocos de 4), campo de OTP de 6 dígitos, código de voucher de 6 caracteres (`7F2K9A`), contagem regressiva de 10 minutos e valores tabulares quando alinhados em extrato/conferência.

### Escala Tipográfica e Regras de Legibilidade

| Estilo | Família | Tamanho / Altura | Peso | Uso |
|---|---|---|---|---|
| `display-balance` | Plus Jakarta Sans | `32px / 36px` | `700` | Saldo principal de sementes e crédito na confirmação de cupom. |
| `voucher-code` | JetBrains Mono | `32px / 36px` | `700` | Código alfanumérico de 6 caracteres no balcão (`tracking-[0.15em]`). |
| `editorial-accent` | Instrument Serif | `22px / 28px` | `400` | Lema editorial pontual (Entrada e cabeçalho de Safra). |
| `h1-screen` | Plus Jakarta Sans | `24px / 30px` | `700` | Título principal de cada tela. |
| `h2-section` | Plus Jakarta Sans | `18px / 24px` | `600` | Títulos de cards e agrupamentos. |
| `input-text` | Plus Jakarta Sans / JetBrains Mono | `>= 16px / 24px` | `400`–`500` | **Mínimo obrigatório de `16px` (`1rem`) em todo `<input>`** para impedir zoom automático no iOS Safari. |
| `body-base` | Plus Jakarta Sans | `15px / 22px` | `400` | Texto corrido, descrições de benefício e termos LGPD. |
| `caption-meta` | Plus Jakarta Sans | `13px / 18px` | `500` | Datas, horários, loja/pavimento e texto auxiliar. |
| `label-section` | Plus Jakarta Sans | `12px / 16px` | `600` | Eyebrows em caixa alta (`tracking-[0.06em]`) e badges. |

### Rigor Numérico e Zoom

- Aplicar `font-variant-numeric: tabular-nums` (`tabular-nums`) em **todos** os saldos, deltas (`+58`, `-300`), valores monetários (`R$ 48,00`), contadores (`2/3`, `32 / 44 dígitos`), posições de ranking, datas/horas e cronômetro `MM:SS`.
- **Reconciliação de `<meta name="viewport">`:** remover `maximum-scale=1.0` e `user-scalable=no` presentes nos arquivos de referência do Stitch. Usar sempre `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />` para preservar ampliação acessível (WCAG 1.4.4).

---

## Layout

### Contêiner Responsivo (Mobile-First < 1024px e Desktop >= 1024px)

- **Largura normativa em mobile e tablet estreito (`< 1024px`):** `max-width: 448px` (`28rem`) para o shell mobile (preservando integralmente a experiência pensada para uso na palma da mão). Entre `449px` e `1023px`, o contêiner `#FAF8F3` permanece centralizado sobre fundo `#F2EDE2` (`sand`), delimitado por borda lateral discreta `1px solid #E2DACB`.
- **Layout Desktop (`>= 1024px` / `lg:`):** o app expande para um layout editorial de duas colunas dentro de um frame máximo de `1440px` (`max-w-[1440px]`), centralizado sobre fundo `#F2EDE2` com borda lateral discreta acima de `1440px`:
  - **Barra lateral fixa (`DesktopSidebar`, `256px` / `w-64`):** exibe a marca `<RaizLogo />`, o CTA primário `"Escanear cupom"` (substituindo o botão flutuante central mobile), os 5 destinos principais (`Início`, `Missões`, `Carteira`, `Prêmios`, `Perfil`) com indicação ativa via `aria-current="page"` + marcador sólido de contraste `>= 3:1`, e rodapé institucional.
  - **Área principal (`<main id="main-content">`):** preenchimento interno `32px` (`lg:p-8`) com largura máxima de conteúdo de `1120px` (`max-w-[1120px]`), grades de 12 colunas (`lg:grid-cols-12`) e colunas de leitura confortáveis.
  - **Navegação de foco e acessibilidade:** link de salto (`skip link`) visível ao foco apontando para `#main-content`; em telas de foco no desktop (`/scan` e `/premios/$rewardId`), a `DesktopSidebar` permanece visível com ação explícita `"Voltar"` no topo da visão.
- **Altura fluida:** usar `min-height: 100dvh` (nunca travar altura fixa como `h-[884px]` vista na Tela 3A do Stitch).
- **Margens e ritmo:** em mobile, padding horizontal padrão de `16px` (`1rem`), espaçamento vertical entre cards de `12px–16px` em grade de `4px`, com `padding-bottom: calc(6rem + env(safe-area-inset-bottom))` quando a Bottom Bar estiver visível (`< 1024px`).
- **Safe areas:** aplicar `env(safe-area-inset-top)` no cabeçalho quando em modo PWA instalado e `env(safe-area-inset-bottom)` na Bottom Bar mobile e nos rodapés sem barra.
- **Alvos de toque:** mínimo obrigatório de **`44px × 44px`** em todo elemento interativo (inclusive botão `"Voltar"`, `"Colar"`, `"Ajuda"`, links de navegação e checkboxes).

### Bottom Bar e Regras de Ocultação

A barra inferior é um `<nav aria-label="Navegação principal">` fixo na base do contêiner (`max-width: 448px`), com fundo `#FFFFFF`, borda superior `1px solid #E2DACB` e altura útil de `64px` acrescida de `env(safe-area-inset-bottom)`:

1. **4 itens de navegação + 1 ação central de scan:**
   - `Início` (`/`) — ícone `Home`
   - `Missões` (`/missoes`) — ícone `ListChecks`
   - **`Escanear`** (`/scan`, posição central) — botão circular **`56px × 56px`** (`w-14 h-14`), fundo `#1F3A2E`, ícone `ScanLine` em `#FAF8F3`, borda `2px solid #C8963E`, elevado suavemente (`-mt-4`) com rótulo `"Escanear"` abaixo (`#1F3A2E`, `font-semibold`). *(Corrige os tamanhos de 40px, 48px e 52px do Stitch.)*
   - `Carteira` (`/carteira`) — ícone `Wallet`
   - `Perfil` (`/perfil`) — ícone `User`
2. **Estado ativo acessível:** o link correspondente à rota atual recebe **`aria-current="page"`**, cor `#1F3A2E`, peso `700` e marcador visual sólido (`2px` ou pílula indicadora em `#1F3A2E`, contraste `>= 3:1` contra `#FFFFFF`), nunca diferenciando a aba ativa apenas por cor (WCAG 1.4.1). Itens inativos usam `#53665B` em `100%` de opacidade.
3. **Ocultação obrigatória da Bottom Bar:**
   - **Entrada (`/entrar`):** oculta no passo de telefone (1A) e no passo de OTP/LGPD (1B).
   - **Fluxo de Scan (`/scan`):** oculta em **todo** o fluxo — Câmera QR (3A), Digitação manual dos 44 dígitos (3B) e Confirmação/Sucesso do cupom (3C).
   - **Voucher Ativo (Tela 6B):** oculta enquanto o voucher ativo (`Redemption`) estiver exibido no `<dialog>` modal ou na rota `/premios/$rewardId`.

---

## Elevation & Depth

A hierarquia visual do Raiz é **tátil e baseada em bordas ("border-first")**, evitando sombras pesadas que imitem elevação sintética:

1. **Camada 0 — Enquadramento Desktop (`#F2EDE2`):** área externa em viewports entre `449px` e `1023px` (centralizando a coluna mobile) e além de `1440px` (centralizando o frame desktop de 2 colunas).
2. **Camada 1 — Canvas de Papel (`#FAF8F3`):** fundo base de todas as telas.
3. **Camada 2 — Superfícies de Conteúdo:**
   - Cards primários (`#FFFFFF` + `1px solid #E2DACB`, sem sombra).
   - Blocos de apoio / conferência / missões concluídas (`#F2EDE2` + `1px solid #E2DACB`, sem sombra).
   - Card herói de saldo na Carteira (`#1F3A2E` sólido com detalhes em `#C8963E` e divisórias internas `rgba(250, 248, 243, 0.16)`).
4. **Camada 3 — Chrome Flutuante e Top Layer:**
   - Somente a `BottomBar`, o botão central `Escanear` (`56×56px`) e `<dialog>` usam sombra quente contida: `0 4px 16px rgba(22, 36, 29, 0.08)` (para `<dialog>`, `0 12px 32px rgba(22, 36, 29, 0.16)`).
   - Backdrop do `<dialog:modal>`: `rgba(22, 36, 29, 0.60)` com `backdrop-filter: blur(2px)`.
5. **Anel de foco acessível (`:focus-visible`):**
   - Em fundos claros (`#FAF8F3`, `#FFFFFF`, `#F2EDE2`): `outline: 2px solid #1F3A2E; outline-offset: 2px;`.
   - Em fundos escuros (`#1F3A2E`): `outline: 2px solid #C8963E; outline-offset: 2px;`.
   - Proibido usar `box-shadow` com efeito glow neon ou remover `outline` sem substituto `:focus-visible`.

---

## Shapes

Os raios de borda ficam padronizados em uma escala enxuta para eliminar inconsistências observadas entre telas do Stitch (`rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-[10px]`):

| Elemento | Raio | Token / Classe |
|---|---|---|
| **Cards principais, Card Herói, `<dialog>` em desktop (`>= 640px`)** | `16px` (`1rem`) | `rounded.card` (`rounded-2xl`) |
| **Botões, inputs, caixas de conferência da chave, controladores segmentados** | `12px` (`0.75rem`) | `rounded.control` (`rounded-xl`) |
| **Badges retangulares (`Demonstração`, bônus do Ritmo), blocos de semana, avisos inline** | `8px` (`0.5rem`) | `rounded.md` (`rounded-lg`) |
| **Checkboxes e marcadores de código inline** | `4px` (`0.25rem`) | `rounded.sm` (`rounded`) |
| **Bottom sheet (`<dialog>` no mobile `< 640px`, cantos superiores)** | `24px` (`1.5rem`) | `rounded.sheet` (`rounded-t-3xl`) |
| **Pills de saldo, badges de status, trilhas de progresso, botão central `Escanear`** | `9999px` | `rounded.full` (`rounded-full`) |

---

## Components

### 1. Marca `RaizLogo` (SVG Único Obrigatório)

As telas 4, 5, 6B e 7 no Stitch utilizaram o ícone genérico `spa`, e as telas 1A, 1B e 2 desenharam SVGs distintos. No frontend real, todas as ocorrências da marca devem renderizar **um único componente compartilhado `<RaizLogo />`**:

- Colmo curvo de capim dourado em `#C8963E` conectado a raízes em `#1F3A2E`, sobre `viewBox="0 0 28 28"`, acompanhado da wordmark **`RAIZ`** em `Instrument Serif`, `tracking-[0.04em]`, cor `#1F3A2E`.
- Proibido substituir `<RaizLogo />` por ícones de biblioteca (`spa`, folhas genéricas) ou variações locais de SVG.

```tsx
<div className="inline-flex items-center gap-2">
  <svg
    aria-hidden="true"
    className="h-7 w-7 shrink-0"
    fill="none"
    viewBox="0 0 28 28"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M14 16C14.8 10.5 18 6 23 4C19.5 6.8 16.2 11 15.2 16"
      stroke="#C8963E"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.2"
    />
    <path
      d="M13.5 16C12 11.5 8.5 7.5 5 5.5C8 8.5 11.2 12 12.2 16.5"
      stroke="#C8963E"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.9"
    />
    <path
      d="M14 16V25M14 20.5L9.5 24.5M14 20L18.5 24"
      stroke="#1F3A2E"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.2"
    />
  </svg>
  <span className="font-serif text-[22px] tracking-[0.04em] text-[#1F3A2E] leading-none">
    RAIZ
  </span>
</div>
```

### 2. Ícones (`lucide-react` Exclusivo)

É **proibido** importar ou usar `Material Symbols Outlined` (`material-symbols-outlined`) ou emojis em qualquer tela. Utilizar exclusivamente ícones **stroke** do pacote `lucide-react` (`strokeWidth={1.75}`), sempre com `aria-hidden="true"` quando acompanhados de texto visível, ou `aria-label` quando em botão iconográfico de `>= 44×44px`.

Mapeamento normativo dos ícones das telas do Stitch para `lucide-react`:

| Contexto na UI | Substitui no Stitch | Ícone `lucide-react` |
|---|---|---|
| Navegação `Início` / `Missões` / `Escanear` / `Carteira` / `Perfil` | `home`, `checklist`, `qr_code_scanner`, `account_balance_wallet`, `person` | `Home`, `ListChecks`, `ScanLine`, `Wallet`, `User` |
| Voltar / Ajuda / Info / Offline | `arrow_back`, `help_outline`, `info`, `wifi_off` | `ArrowLeft`, `CircleHelp`, `Info`, `WifiOff` |
| Câmera (Lanterna) / Digitação manual / Colar | `flashlight_on`, `flashlight_off`, `keyboard`, `content_paste` | `Flashlight`, `FlashlightOff`, `Keyboard`, `ClipboardPaste` |
| Confirmações / LGPD / Baixar / Apagar | `check_circle`, `check`, `verified_user`, `download`, `delete` | `CheckCircle2`, `Check`, `ShieldCheck`, `Download`, `Trash2` |
| Voucher (Relógio, Brilho, Copiar, Compartilhar) | `schedule`, `brightness_high`, `content_copy`, `share` | `Clock`, `Sun`, `Copy`, `Share2` |
| Extrato e Prêmios (`Cupom`, `Prêmio`, `Loja`, `Ritmo`, `Carregar mais`) | `receipt_long`, `redeem`, `shopping_bag`, `storefront`, `local_fire_department`, `expand_more` | `ReceiptText`, `Gift`, `ShoppingBag`, `Store`, `CalendarCheck2`, `ChevronDown` |

### 3. Botões (`Button`)

- **Primário:** fundo `#1F3A2E`, texto `#FAF8F3`, altura `48px` (`h-12`), raio `12px`, hover `#16241D`.
- **Secundário / Sand:** fundo `#FFFFFF` ou `#F2EDE2`, texto `#16241D` (ou `#1F3A2E`), borda `1px solid #E2DACB` (ou `#1F3A2E` em ação secundária de destaque), altura mínima `44px` (`48px` quando full-width).
- **Destrutivo (LGPD excluir conta):** fundo `#FAF8F3`, borda `1px solid #B33A2E`, texto `#B33A2E`, hover/ativo `#FAEBE9`.
- **Estado de envio (`isPending`):** manter o botão visível com `disabled={true}` e alterar o rótulo para estado de progresso (ex.: `"Enviando..."`, `"Validando..."`, `"Resgatando..."`), sem substituir o formulário por skeleton.
- **Prêmio sem saldo suficiente:** manter altura mínima `44px`, fundo `#F2EDE2`, borda `#E2DACB` e texto em `#53665B` (`5.26:1`), nunca reduzir opacidade a ponto de perder legibilidade.

### 4. Inputs, Dicas Acima do Campo e Validação (`:user-invalid`)

Todos os campos usam `react-hook-form` + `zod` + primitivos `Form*` de `components/ui/form.tsx`, respeitando as seguintes regras de web moderna e acessibilidade:

1. **Tamanho de fonte `>= 16px` (`1rem`)** obrigatório em todo `<input>`.
2. **Dica de formato posicionada ACIMA do `<input>`**, vinculada via `aria-describedby`, para nunca ser encoberta pelo teclado virtual móvel nem por popovers de autofill do navegador.
3. **Validação pós-interação (`:user-invalid` / `:user-valid`):** nunca exibir estado visual de erro ao carregar a tela ou enquanto o usuário ainda digita pela primeira vez. Aplicar borda `#B33A2E` e fundo `#FAEBE9` via `:user-invalid` (ou após `blur`/tentativa de envio com `aria-invalid="true"` sincronizado), mantendo o elemento de erro fora do `aria-describedby` enquanto oculto para evitar leitura prematura por leitores de tela.
4. **Campo de 44 dígitos (`AccessKeyInput`):**
   - `<input type="text" inputmode="numeric" autocomplete="off" spellcheck="false" />` em `JetBrains Mono` `16px`.
   - Botão `"Colar"` (`ClipboardPaste`) com área mínima de `44px × 44px` no cabeçalho do campo.
   - Grade auxiliar de conferência logo abaixo do input: bloco `#F2EDE2` com contador `X / 44 dígitos` (`tabular-nums`) e 11 células de 4 dígitos em `JetBrains Mono`.

### 5. Campo OTP de Input Único (`one-time-code`)

- Proibido dividir o código de 6 dígitos em 6 `<input maxlength="1">` separados.
- Usar **um único `<input>`** com:
  - `type="text"` (nunca `type="number"`, para preservar zeros à esquerda como `000000` e evitar setas/scroll acidental),
  - `inputmode="numeric"`,
  - `autocomplete="one-time-code"`,
  - `pattern="\d{6}"`,
  - `maxlength="6"`.
- Dica *"Código de 6 dígitos enviado no WhatsApp"* acima do campo (`aria-describedby`).
- Estilização em `JetBrains Mono`, `24px` (`>= 16px`), `font-bold`, `text-center`, `letter-spacing: 0.35em`, altura `52px`, borda `#7D7463`.

### 6. Modais e Confirmações (`<dialog>` Nativo)

Todo modal, bottom-sheet bloqueante ou confirmação crítica (ex.: Voucher Ativo, confirmação de *"Apagar minha conta"*, modal de *"Modelo impresso"* da NFC-e ou *"Ajuda"*):

- Deve usar o elemento HTML nativo **`<dialog>`** aberto via **`dialogRef.current?.showModal()`** (nunca `div` com `fixed inset-0` manual para modais, nunca `show()` ou atributo `open` em modal bloqueante, nunca `role="dialog"` ou `aria-modal` redundantes).
- **Proibido** aplicar `overflow: hidden` ou `position: fixed` em `<html>` ou `<body>` ao abrir o modal. O bloqueio de rolagem da página subjacente é feito exclusivamente via CSS no top layer:

```css
dialog:modal {
  overscroll-behavior: contain;
}

dialog::backdrop {
  background-color: rgba(22, 36, 29, 0.6);
  backdrop-filter: blur(2px);
  overflow: hidden;
  overscroll-behavior: contain;
}
```

- Nome acessível obrigatório com `aria-labelledby` apontando para o título do diálogo.
- Em confirmações destrutivas (`DELETE /v1/me`), o botão seguro (*"Cancelar"*) recebe **`autofocus`** para prevenir exclusão acidental por `Enter`, e os botões ficam posicionados sem deslocamento de layout quando houver mensagem adicional.

### 7. Skeletons, Estados de Erro/Vazio e `prefers-reduced-motion`

- **Skeleton (`isPending` inicial):** reproduz a silhueta exata dos cards reais em blocos `#F2EDE2` com borda `#E2DACB`, dentro de `role="status"` e `aria-label` descritivo (ex.: `aria-label="Carregando painel inicial"`). **Proibido** usar shimmer brilhante agressivo, gradientes animados velozes ou spinner solto em listas.
- **Erro (`isError`):** nunca renderizar tela branca. Sem dados em cache, exibir `<ErrorState>` com mensagem traduzida via `messages.ts` e botão `"Tentar de novo"` (`onRetry={() => refetch()}`); com dados em cache, manter o conteúdo visível com banner compacto no topo e ação de tentar novamente.
- **Vazio:** exibir `<EmptyState>` explicando o estado e o próximo passo acionável (ex.: *"Nenhum cupom ainda — escaneie o QR do cupom"*).
- **Motion e acessibilidade (`prefers-reduced-motion`):**
  - Animações decorativas ou contínuas (como a linha de leitura da câmera QR e transições de entrada de `<dialog>`) devem ser opt-in dentro de `@media (prefers-reduced-motion: no-preference)`.
  - Nunca declarar `animation-duration: 0.01ms !important;` globalmente; manter transições não-espaciais discretas de `color`, `background-color` e `border-color`.

### 8. Badges Semânticos (Incluindo `Demonstração` Obrigatório)

| Variante | Fundo / Texto / Borda | Quando usar |
|---|---|---|
| `Demonstração` | `#ECF1F5` / `#334E68` / `1px dashed #9FB3C8` | **Obrigatório** quando `home.demo === true` ou `meta.demo_mode === true`, e no aviso do código fixo `000000` na tela OTP. |
| `Sucesso / Crédito / Ativo` | `#E6F2EB` / `#1E643D` / `1px solid #1E643D` (ou `#E2DACB`) | Cupom registrado, missão concluída e status `Ativo` do voucher. |
| `Ouro / Nível / Recompensa` | `#F7EEDB` / `#7D5512` / `#E2DACB` | Badge de nível (`Semente`, `Raiz`, `Dourado`), bônus `+150 sementes` e posição do visitante no ranking. |
| `Aviso / Fila Offline / Timer` | `#FDF3DF` / `#7D5512` / `#E2DACB` | Aviso de envio enfileirado offline e cronômetro regressivo de 10 minutos no voucher. |
| `Erro` | `#FAEBE9` / `#B33A2E` / `#B33A2E` | Alertas de falha recuperável e confirmação destrutiva. |

### 9. Cards de Domínio (Alinhados a `docs/openapi.yaml`)

- **Card de Missão (`MissionProgress`):** exibe `title`, badge `+${reward_points} sementes` (`#F7EEDB` / `#7D5512`), razão `${progress}/${target}` em `tabular-nums`, trilha `#E2DACB` com barra `#C8963E`. Quando `completed_at !== null`, muda para superfície `#F2EDE2` com ícone `Check` em `#1E643D`.
- **Card de Prêmio (`Reward`):** exibe `title` (benefício concreto, ex.: *"Café na Casa do Pão"*), `cost` em `#7D5512` `tabular-nums`, disponibilidade (`stock === null ? "Ilimitado" : "${stock} restantes"`), `store_name` e `terms`. Botão `"Resgatar"` fica ativo apenas quando `affordable === true`; caso contrário mostra `"Faltam ${cost - balance} sementes"`.
- **Item de Extrato (`LedgerEntry`):** exibe ícone por `kind`, `description` + `store_name`, data/hora local formatada e `delta` em `JetBrains Mono tabular-nums` (`+N` em `#1E643D`, `-N` em `#16241D`), carregado por paginação via `next_cursor`.
- **Card de Resultado do Cupom (`ReceiptResult`):** exibe `+${receipt.points_awarded} sementes` em `display-balance`; mostra `receipt.store_name` e valor em `R$` apenas quando `receipt.total_cents !== null`. Se `receipt.status === "review"` (CNPJ fora da base parceira), exibe confirmação normal das `10` sementes base com nota discreta de revisão — nunca estado de erro.

---

## Do's and Don'ts

### Tom, Linguagem Regional e Marca

- **DO:** usar português do Brasil adulto, sereno e ligado ao cerrado tocantinense e ao Capim Dourado Shopping (*"Quem volta, cria raiz"*, *"sementes"*, *"Safra"*, *"Ritmo"*, *"benefício real"*, *"Sem senha. Sem app."*).
- **DO:** nomear prêmios com benefícios reais e tangíveis (*"Café na Casa do Pão"*, *"2h de estacionamento"*, *"Ingresso de cinema"*).
- **DON'T:** usar **emojis** em textos, botões, notificações ou mensagens de erro.
- **DON'T:** usar mascote, avatar ou foto de usuário em perfil, cabeçalho ou ranking.
- **DON'T:** usar os termos **"moedinha"**, **"zap"**, **"50% OFF"** (ou descontos percentuais genéricos) ou mensagens infantilizadas como **"parabéns, você subiu de nível"**.
- **DON'T:** exibir dados de `seed` ou o código de demo `000000` sem o selo explícito **`Demonstração`**.

### Soberania do Contrato `docs/openapi.yaml` (Reconciliações Obrigatórias sobre o Stitch)

O gerador visual do Stitch produziu protótipos com campos e fluxos que **não existem** em [openapi.yaml](./openapi.yaml). Na implementação em `apps/web/`, seguir estritamente as adaptações abaixo:

| Ponto no Stitch | Realidade em `docs/openapi.yaml` | Norma obrigatória no frontend |
|---|---|---|
| Botão `"Baixar meus dados"` sugerindo endpoint de exportação | **Não existe** `GET /v1/me/export` no contrato. | Realizar a **exportação JSON no cliente**, combinando `GET /v1/me` e todas as páginas de `GET /v1/me/ledger` (via `next_cursor`), gerando download `.json` com `Blob`. |
| Barra `"240 / 500 sementes (12 meses)"` baseada em campo inventado `tier_points_12m` | `Me` expõe `balance`, `tier` (`semente \| raiz \| dourado`), `next_tier_at`, `streak_weeks`, `receipts_count` e `first_visit_at`. | **Proibido inventar `tier_points_12m`.** Exibir `tier` e `next_tier_at` (quando não `null`) exatamente como retornados por `GET /v1/me`. |
| Card `"Traga alguém"` com URL fixa `raiz.app/entrar?ref=JU4821` e banner de convite na Entrada | `Visitor`, `Me` e `POST /v1/auth/verify` **não possuem** `referral_code` nem parâmetro de indicação no contrato atual. | **Proibido** renderizar código/link hardcoded ou enviar campo ausente no `POST /v1/auth/verify`. Exibir apenas o que estiver no `schema.d.ts` gerado. |
| Subtítulo `"3ª visita este mês."` na Tela Início | `Home` retorna `demo`, `greeting_name`, `balance`, `tier`, `streak_weeks`, `next_step`, `today` (`events`, `offers`) e `closest_reward`. | Renderizar exclusivamente os campos presentes em `GET /v1/home`, sem inventar contagem mensal. |
| Voucher Ativo com timer fixo `09:42` e QR estático decorativo | `Redemption` nasce exclusivamente na resposta `201` de `POST /v1/rewards/{id}/redeem` (`id`, `code`, `expires_at`, `balance_after`, `reward`), sem `GET /v1/redemptions/{id}`. | Alimentar código (`code`), QR Code real e contagem regressiva exclusivamente com os dados retornados pela mutation (`expires_at` do servidor); se a rota de voucher for aberta sem `Redemption` ativo em estado/memória, redirecionar para `/premios`. |
| Confirmação de cupom sempre mostrando `"Casa do Pão · R$ 48,00"` | `ReceiptResult.receipt.total_cents` e `store_name` são `nullable`, e `status` pode ser `accepted \| review`. | Omitir valor em `R$` quando `total_cents === null`; tratar `status === "review"` sem mensagem de erro. |

### Boas Práticas Técnicas de UI

- **DO:** gerar `src/api/schema.d.ts` a partir de `docs/openapi.yaml`, consumir apenas hooks do TanStack Query com `openapi-fetch` e traduzir `error.code` em `messages.ts` (nunca mostrar `error.message` cru da API).
- **DO:** aplicar optimistic update **somente** no débito local de sementes ao resgatar um prêmio (com rollback em `onError`), aguardando o servidor para o código do voucher e estoque.
- **DO:** manter `Idempotency-Key` persistida na fila offline de `POST /v1/receipts`.
- **DON'T:** usar dados mockados, listas fixas de prêmios/ofertas ou `fetch` manual em componentes.
- **DON'T:** usar `Material Symbols Outlined`, múltiplos SVGs para o logo, `<input>` com fonte `< 16px`, múltiplos inputs para OTP ou `div` manual no lugar de `<dialog>` com `showModal()`.
