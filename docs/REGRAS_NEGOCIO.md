# Regras de Negócio e Domínio — Raiz

> **Documento vivo.** Consulte antes de implementar qualquer funcionalidade ou alteração de schema/API. Sempre que o domínio, o modelo de dados ou as validações forem modificados (mediante aprovação explícita das regras imutáveis em [AGENTS.md](../AGENTS.md)), mantenha este arquivo sincronizado.

**Referências principais:** [ENTREGA-1.md](../entregas/ENTREGA-1.md) · [AGENTS.md](../AGENTS.md)

---

## 1. O que o Sistema Deve Fazer (Escopo Funcional)

O **Raiz** é um PWA de engajamento e fidelização contínua para visitantes do Capim Dourado Shopping (Palmas-TO). O sistema deve:

1. **Identificar o visitante com atrito mínimo e consentimento LGPD:** cadastro/acesso apenas com **nome e telefone** (sem senha e sem exigência de instalação), validado por código OTP de 6 dígitos e consentimento explícito datado.
2. **Capturar visitas e compras via cupom fiscal (NFC-e):** ler o QR Code pela câmera ou aceitar digitação manual dos **44 dígitos** da chave de acesso (obrigatória na mesma tela), validar localmente o dígito verificador e registrar a visita por loja (CNPJ).
3. **Pontuar e auditar via Ledger:** converter cupons, missões, sequência semanal (*Ritmo*) e indicações em *sementes*, mantendo todo o histórico de créditos e débitos em um extrato auditável (`ledger`).
4. **Conduzir o visitante ao próximo passo (cross-shopping e retorno):** exibir na tela inicial um agregado único (`GET /v1/home`) com saldo, próximo passo de missão, programação/ofertas do dia e proximidade de recompensa, além de gerir *Missões*, *Ritmo*, *Níveis* e *Safra* (temporadas de 8 semanas).
5. **Permitir resgate imediato de benefícios reais na mesma visita:** listar recompensas reais com estoque controlado e emitir voucher com QR Code e código único de 6 dígitos/caracteres (validade de 10 minutos no balcão) em transação atômica.
6. **Garantir transparência e direitos do titular (LGPD):** permitir consulta aos cupons lidos, exportação dos dados pessoais ("baixar meus dados") e exclusão da conta diretamente na interface ("apagar minha conta").
7. **Expor API para lojistas e shopping:** disponibilizar consulta de ofertas ativas (`GET /v1/offers`) e métricas exclusivamente agregadas (`GET /v1/metrics/summary`).
8. **Funcionar sob rede instável e sem depender de APIs externas:** manter fila offline para cupons escaneados e degradar graciosamente se SEFAZ, WhatsApp Cloud API ou OpenWeather falharem ou excederem `2s`.

### Diretrizes de Linguagem, UX e Não-Escopo
- **Tom obrigatório:** linguagem adulta, direta e regional (cerrado / Capim Dourado). **É proibido** usar emojis, mascotes, avatares, o termo *"moedinha"* ou mensagens do tipo *"parabéns, você subiu de nível"*.
- **Benefícios reais:** prêmios devem sempre ter nome de benefício concreto (ex.: *"Café na Casa do Pão"*, *"2h de estacionamento"*, *"Ingresso de cinema"*).
- **Transparência na UI:** dados de demonstração (`seed`) e OTP de demo (`000000`) devem ser explicitamente rotulados como demonstração na tela.
- **Zero mock no frontend:** todas as telas consomem `/v1/*`; estados de carregamento (`isPending` com skeleton) e erro (`isError` com botão *"tentar de novo"*) são obrigatórios (nunca tela em branco).
- **Proibições de escopo no MVP:** não implementar cashback em reais, cartão físico, app nativo, cupom de desconto genérico, integração com PDV, painel administrativo completo de lojista, check-in por GPS/beacon/Wi-Fi captive portal, OCR de foto de cupom, push/e-mail/CRM, multi-shopping/white-label/i18n ou chatbot enfeite.

---

## 2. Entidades e Modelo de Dados

### 2.1 Entidades centrais previstas

| Entidade (`tabela`) | Atributos definidos | Papel e invariantes |
|---|---|---|
| **Visitante** (`visitors`) | `id`, `phone_hash`, `phone_enc`, `name`, `created_at`, `consent_at`, `deleted_at` | Identidade mínima do visitante. Armazena apenas nome e telefone protegido (hash para busca + criptografia para exibição). **Não possui coluna `balance`.** `deleted_at` controla soft delete. |
| **Loja** (`stores`) | `id`, `cnpj`, `name`, `category`, `floor`, `is_partner` | Estabelecimento identificado pelo CNPJ extraído da chave NFC-e. `category` sustenta missões de mix (ex.: alimentação, moda); `is_partner` distingue lojas cadastradas/parceiras de CNPJs desconhecidos. |
| **Cupom NFC-e** (`receipts`) | `id`, `visitor_id`, `store_id`, `access_key` (`UNIQUE`), `total_cents` (`NULL`), `issued_at`, `points_awarded`, `source`, `created_at` | Registro de cada cupom validado. `access_key` tem unicidade garantida por constraint. `total_cents` é inteiro em centavos (opcional quando não obtido da SEFAZ). |
| **Extrato / Ledger** (`ledger`) | `id`, `visitor_id`, `kind`, `delta`, `ref_type`, `ref_id`, `created_at` | **Fonte única da verdade do saldo.** Todo ganho ou resgate gera lançamento imutável (`delta` positivo ou negativo) referenciando sua origem (`ref_type`, `ref_id`). |
| **Safra** (`seasons`) | `id`, `name`, `starts_at`, `ends_at`, `status` | Ciclo competitivo/temático de 8 semanas que agrupa missões e o ranking do período. |
| **Missão** (`missions`) | `id`, `season_id`, `code`, `title`, `rule_type`, `target`, `reward_points`, `categories` | Definição de metas dentro de uma safra (ex.: visitar 3 lojas diferentes, combinar alimentação + moda). `categories` nomeia as categorias de `stores` que uma missão `category` conta; lista vazia significa "qualquer categoria distinta" (compatível com missões antigas). |
| **Progresso de Missão** (`mission_progress`) | `visitor_id`, `mission_id`, `counter`, `completed_at` | Estado da missão por visitante. `completed_at` registra o momento exato da conclusão para evitar crédito duplicado. |
| **Recompensa** (`rewards`) | `id`, `store_id` (`NULL`), `title`, `cost`, `stock` (`NULL`), `terms` | Benefício real disponível no catálogo. Pode pertencer a uma loja (`store_id`) ou ao shopping (`store_id IS NULL`); `stock NULL` significa estoque ilimitado. |
| **Resgate / Voucher** (`redemptions`) | `id`, `visitor_id`, `reward_id`, `code` (`UNIQUE`), `status`, `created_at`, `used_at` | Voucher emitido após débito atômico. `code` tem unicidade por constraint e validade de 10 minutos para conferência no balcão. |

### 2.2 Índices mínimos e extensões pendentes de modelagem detalhada
- **Índices obrigatórios no PostgreSQL 16:**
  - `receipts(visitor_id, created_at)`
  - `ledger(visitor_id, created_at)`
  - `receipts(store_id, issued_at)`
- **Itens previstos nos wireframes/endpoints que exigirão definição SQL na migração inicial:**
  - Estrutura de ofertas e agenda de eventos ("Hoje no Capim") servidos em `GET /v1/home` e `GET /v1/offers`.
  - Mecanismo de fila de revisão para CNPJs desconhecidos (ex.: flag em `stores` ou tabela auxiliar).
  - Registro do vínculo de indicação ("traga alguém") para bonificar indicador e convidado no 1º cupom validado.

---

## 3. Fluxos do Sistema

### 3.1 Mapa das 7 telas (PWA)
Barra inferior fixa com 4 itens (**Início · Missões · Carteira · Perfil**) e botão de **Escanear cupom** sempre acessível:
1. **Entrada:** telefone → código OTP de 6 dígitos → consentimento explícito.
2. **Início ("Hoje no Capim"):** alimentada por uma única chamada (`GET /v1/home`) com saldo, saudação contextual, próximo passo de missão, eventos/ofertas do dia e quanto falta para o próximo prêmio.
3. **Escanear cupom:** câmera para QR Code + botão/campo obrigatório para digitação dos 44 dígitos + tela de confirmação imediata com sementes ganhas e avanço de missão.
4. **Carteira:** saldo atual, progresso de nível (12 meses móveis), contador de *Ritmo* e extrato completo paginado por cursor.
5. **Missões e Safra:** missões em andamento, missões concluídas e ranking da safra (calculado como view sobre o `ledger`).
6. **Prêmios e Voucher:** catálogo de recompensas reais; ao resgatar, exibe código único de 6 caracteres/dígitos e QR Code para uso em até 10 minutos no balcão.
7. **Perfil, Níveis e LGPD:** nível atual, histórico de 12 meses, link de convite (*"traga alguém"*), botão **baixar meus dados** e botão **apagar minha conta**.

### 3.2 Fluxo de Autenticação e Consentimento (Tela 1)
1. O visitante informa nome e telefone.
2. O frontend (Zod) e o backend validam o formato do telefone; telefone inválido exibe erro inline.
3. `POST /v1/auth/otp` dispara o código de 6 dígitos via WhatsApp Cloud API (timeout `2s`; em ambiente de demonstração, utiliza o código fixo `000000` explicitamente identificado na tela, com link `wa.me` como plano B operacional).
4. O visitante informa o código e aceita o termo curto de consentimento (finalidade explícita e transparência do que é armazenado).
5. `POST /v1/auth/verify` valida o código, cria/recupera o visitante registrando `consent_at`, armazena `phone_hash` e `phone_enc`, e retorna **JWT HS256 (30 dias)** em menos de **3 segundos**.

### 3.3 Fluxo Crítico — Envio e Processamento do Cupom NFC-e (Tela 3)
1. O visitante escaneia o QR Code da NFC-e ou digita manualmente os **44 dígitos** da chave de acesso. Caso esteja sem conexão (4G/Wi-Fi ruim), o envio permanece em fila offline no cliente.
2. O cliente envia `POST /v1/receipts` com header `Idempotency-Key`.
3. A API valida localmente:
   - Formato de 44 dígitos numéricos;
   - Dígito verificador pelo algoritmo **módulo 11**;
   - Extração de UF, mês/ano de emissão e **CNPJ do emissor**;
   - Regras de janela temporal (72h) e tetos diários (1 por loja/dia, 5 cupons/dia).
4. A API consulta `receipts` pela `access_key`:
   - Se já existir, retorna **`409 already_claimed`** e **não** credita pontos.
5. A API busca `stores` pelo CNPJ extraído:
   - Se o CNPJ for desconhecido (fora das lojas parceiras mapeadas), o sistema **não exibe erro ao visitante**, registra para fila de revisão e segue com pontuação base (`10` sementes).
6. Quando aplicável, a API consulta opcionalmente o portal da SEFAZ (timeout máximo de `2s` e circuit breaker):
   - A consulta ao portal do Tocantins só é feita quando a entrada carrega o **payload do QR** (parâmetro `p=`); na digitação manual dos 44 dígitos o cupom credita o valor base;
   - Cupons do TO convivem com QR v1/v2/v3: só o v2 traz hash. O payload é normalizado para os 5 campos que o portal espera (percent-decoding, hash cortado em 40 e campos ausentes preenchidos), porque o portal localiza a nota pela chave e ignora o hash;
   - Se obtiver o valor total, preenche `total_cents`;
   - Se a resposta da SEFAZ contiver CPF do consumidor, o CPF é **imediatamente descartado** (nunca persistido nem logado);
   - Se a consulta falhar, exceder `2s` ou receber `429 Retry-After`, a API degrada localmente e credita com base nos `10` pontos base;
   - O portal do Tocantins não tem contrato público e limita **20 requisições/minuto por IP**; o cliente respeita o `Retry-After` e abre o circuito após falhas seguidas.
7. Em uma **transação única** no PostgreSQL:
   - Insere registro em `receipts`;
   - Insere lançamento(s) em `ledger`;
   - Atualiza `mission_progress`, avalia conclusão de missões, ritmo semanal e bônus de 1º cupom por indicação (quando aplicável);
   - Efetua `COMMIT` e responde `201` em `< 3s` com pontos creditados, novo saldo e progresso de missões.

### 3.4 Fluxo de Resgate de Prêmio e Voucher (Tela 6)
1. Na UI, o resgate pode aplicar *optimistic update* (com reconciliação pelo servidor).
2. `POST /v1/rewards/{id}/redeem` abre uma **transação no PostgreSQL**:
   - Calcula o saldo atual do visitante pela soma de `ledger.delta`;
   - Verifica se `saldo >= reward.cost` e se o estoque (`stock`) está disponível (quando não `NULL`);
   - Registra lançamento negativo (`-cost`) no `ledger`, garantindo que o saldo resultante **nunca seja negativo**;
   - Decrementa `rewards.stock` atomicamente quando `stock` não for `NULL`;
   - Gera registro em `redemptions` com `code` único de 6 caracteres/dígitos (ex.: `7F2K9A`) e validade de **10 minutos** para uso no balcão.
3. O visitante apresenta o código/QR no balcão da loja ou serviço do shopping dentro da janela de 10 minutos.

### 3.5 Fluxo de Direitos LGPD (Tela 7)
1. **Transparência:** o visitante visualiza na Carteira todos os cupons processados e suas origens no extrato.
2. **Portabilidade/Acesso:** botão *"baixar meus dados"* exporta os dados do titular mantidos pelo serviço.
3. **Exclusão:** botão *"apagar minha conta"* chama `DELETE /v1/me`, gravando `deleted_at` (soft delete imediato com previsão de anonimização definitiva em até 30 dias).

### 3.6 Fluxo da API Pública / Parceiros
1. Lojista/shopping (autenticado com chave e escopo de parceiro) publica ou consulta ofertas ativas em `GET /v1/offers` (paginação por cursor), consumidas na mesma fonte pela UI do visitante.
2. Lojista/shopping consulta `GET /v1/metrics/summary` para obter indicadores agregados (visitas identificadas, cross-store, recorrência por safra), sem acesso a dados individuais de visitantes.

---

## 4. Validações e Regras de Domínio

### 4.1 Regras de Pontuação e Mecânicas
| Mecânica | Regra de negócio | Condições e limites |
|---|---|---|
| **Cupom NFC-e** | `10` sementes base `+ 1` semente por real gasto quando `total_cents` estiver disponível. | Sem `total_cents` (falha/timeout SEFAZ) ou CNPJ desconhecido: credita `10` sementes base, sem erro na UI. |
| **Missão de loja** | Visitar **3 CNPJs diferentes em 7 dias** → **`+150` sementes**. | **Conclui uma única vez** por missão/visitante (controlado por `completed_at`). |
| **Missão de categoria** | Comprar em **alimentação + moda na mesma semana** → **`+100` sementes**. | Requer lojas mapeadas nas respectivas categorias. A missão declara em `missions.categories` quais categorias contam (lista vazia = qualquer categoria distinta); categorias fora da lista não avançam a missão. |
| **Missão contextual (clima)** | Regra opcional via OpenWeather (ex.: dia de chuva → *"cinema + café valem dobrado"*). | Se a API externa falhar ou passar de `2s`, cai para missão padrão da safra. |
| **Ritmo** | **4 semanas seguidas** com pelo menos `1` cupom válido → **`+200` sementes**. | **Regra anti-punição:** quebrar a sequência reseta apenas o contador/multiplicador; **jamais subtrai sementes** já ganhas. |
| **Safra e Ranking** | Ciclo de **8 semanas**; Top 10 ganha experiência (ex.: camarote de evento, valet). | Ranking é apenas uma **view sobre o `ledger`** no período da safra. |
| **Níveis (12 meses móveis)** | `Semente` (inicial) → `Raiz` (`≥ 500` sementes nos últimos 12 meses) → `Dourado` (`≥ 2.000` sementes nos últimos 12 meses). | Avaliado pela soma de ganhos na janela móvel de 12 meses; não gera notificações infantilizadas. |
| **Indicação** | Convidado valida o **1º cupom** → **`+100` sementes para os dois** (indicador e convidado). | Crédito só ocorre após validação efetiva do primeiro cupom do convidado (evita cadastro vazio). |

### 4.2 Validações de Entrada, Antifraude e Consistência
- **Telefone:** obrigatório formato válido na entrada; erro inline imediato na UI.
- **Chave de acesso NFC-e:** exatamente **44 dígitos** numéricos e aprovação no dígito verificador **módulo 11**.
- **Unicidade de cupom:** constraint `UNIQUE` em `receipts.access_key`. Tentativa repetida retorna `409 already_claimed` e nunca credita duas vezes.
- **Idempotência de envio:** header `Idempotency-Key` suportado/exigido em `POST /v1/receipts` para evitar duplicidade por retentativa ou fila offline.
- **Limite por loja/dia:** máximo de **1 cupom por loja por dia** por visitante.
- **Teto diário:** máximo de **5 cupons por dia** por visitante.
- **Janela de emissão:** cupom deve ter sido emitido há no máximo **72 horas**.
- **Rate limit:** proteção por telefone e por IP nos fluxos de autenticação e scan.
- **Invariante do Ledger:** saldo = `SUM(ledger.delta)`; **saldo nunca pode ficar negativo**; estoque (`rewards.stock` quando não `NULL`) nunca pode ficar negativo.
- **Unicidade do voucher:** constraint `UNIQUE` em `redemptions.code`; código de 6 dígitos/caracteres válido por **10 minutos** no balcão.

### 4.3 Regras de Contrato HTTP e Integrações Externas
- **Padrão de API:** OpenAPI 3.1 (`docs/openapi.yaml` servido em `/docs`), payloads JSON em `snake_case`, datas/timestamps em **ISO-8601 UTC**, valores monetários em **centavos (`integer`)**, erros no formato `{ "error": { "code": "...", "message": "...", "details": ... } }`, paginação por **cursor** (`/v1/me/ledger`, `/v1/offers`).
- **Integrações externas (SEFAZ, WhatsApp Cloud API, OpenWeather):** isoladas com timeout máximo de **`2s`**, circuit breaker simples e degradação local obrigatória.

### 4.4 Regras de Privacidade, Segurança e LGPD
- **Minimização estrita:** armazenar apenas nome e telefone. Proibido coletar localização GPS, contatos ou dados de pagamento.
- **Descarte de CPF:** qualquer CPF presente no cupom ou retorno da SEFAZ deve ser descartado imediatamente em memória — **nunca gravar em banco ou log**.
- **Sigilo em banco e logs:** telefone persistido apenas como `phone_hash` (lookup) e `phone_enc` (exibição); proibido logar telefone em claro ou segredos com `log/slog`.
- **Retenção e exclusão:** retenção máxima de cupons por **24 meses** seguida de anonimização; exclusão via `DELETE /v1/me` marca `deleted_at` com anonimização prevista em **30 dias**.
- **Isolamento de relatórios:** `GET /v1/metrics/summary` retorna exclusivamente dados agregados, jamais dados individuais de visitantes.

### 4.5 Regra de Contingência (Ordem de Corte do MVP)
Se houver pressão de prazo durante o evento, funcionalidades só podem ser cortadas estritamente nesta ordem:
1. `ranking` (Safra / leaderboard)
2. `prêmios` (Catálogo e resgate)
3. `missão de categoria` (Alimentação + moda)
4. `nível` (Semente / Raiz / Dourado)

**Nunca cortar:** escanear cupom (QR + 44 dígitos), saldo/ledger e tela inicial (`GET /v1/home`).
