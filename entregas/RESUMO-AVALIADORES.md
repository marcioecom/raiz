# Raiz — resumo para os avaliadores

**HackaRun 2026 · Desafio 05 — Engajamento e fidelização dos visitantes · Capim Dourado Shopping (Palmas-TO)**

## 1. Problema identificado

O shopping mede fluxo: sabe quantas pessoas passaram no mês, mas não sabe **quem voltou**. Sem essa identidade, não há como medir recorrência, cruzamento de consumo entre lojas (cross-shopping), ticket por categoria nem o valor do visitante no tempo (LTV). A alternativa usual — integrar com o PDV de cada lojista — é caríssima, lenta e depende de sistemas heterogêneos. O resultado é uma operação que investe em tráfego sem saber se o tráfego retorna.

## 2. Público-alvo

- **Visitante do shopping** em Palmas-TO: está em pé no corredor, com o cupom na mão e 4G instável. Quer registrar a compra e ver o benefício em menos de um minuto, sem instalar aplicativo nem criar senha.
- **Lojista e administração do shopping**, que precisam de recorrência mensurável e de um canal de atração sem alterar o caixa.

## 3. Solução proposta

O **Raiz** usa um comportamento que o visitante já tem: **escanear o QR Code da NFC-e** (ou digitar os 44 dígitos da chave de acesso do cupom fiscal). A partir dele, o sistema cria identidade persistente, credita sementes, avança missões entre lojas e categorias e libera recompensas reais resgatáveis **na mesma visita** — sem app nativo, sem integração com PDV e sem tocar no caixa do lojista.

Três decisões sustentam a proposta:

1. **O cupom é a identidade.** A chave de acesso é validada localmente (formato e dígito verificador módulo 11); a consulta à SEFAZ é apenas enriquecimento, com timeout de 2s e degradação garantida. Loja fora do cadastro parceiro pontua e entra em revisão — nunca vira erro para o visitante.
2. **O saldo é um ledger.** Não existe coluna de saldo mutável: o saldo é sempre a soma de lançamentos, e o resgate roda em transação única (saldo nunca negativo, estoque decrementado, voucher único de 6 caracteres com validade de 10 minutos no balcão).
3. **Antifraude no banco.** Chave fiscal única por constraint, 1 cupom por loja por dia, teto de 5 cupons/dia e janela de emissão de 72 horas.

## 4. Descrição do produto (MVP entregue)

PWA mobile-first, sem instalação, com 7 telas: entrada por telefone e OTP, início, scan do cupom, carteira/extrato, missões, prêmios com voucher e perfil com direitos LGPD. A barra inferior mantém quatro destinos e o botão de scan sempre acessível.

- **Pontuação:** 10 sementes por cupom + 1 por real gasto (valor obtido no enriquecimento da SEFAZ-TO).
- **Missões:** 3 lojas diferentes em 7 dias (+150); alimentação + moda na mesma semana (+100); ritmo de 4 semanas consecutivas (+200, sem nunca punir falta).
- **Níveis** em 12 meses móveis: Semente, Raiz (500) e Dourado (2.000).
- **Safra de 8 semanas** com ranking derivado do próprio ledger (top 10, nome abreviado).
- **Resgate atômico** de benefícios reais ("café na padaria", "2h de estacionamento"), com estoque e termos.
- **LGPD por desenho:** apenas nome e telefone; telefone guardado como hash + cifra; CPF do cupom lido e descartado; consentimento com data; exclusão de conta funcional.

## 5. Tecnologias utilizadas

- **Frontend:** React 19 + Vite, TypeScript, TanStack Router e Query, Tailwind CSS, PWA com fila offline no scan; cliente HTTP **gerado do contrato OpenAPI** (`openapi-typescript` + `openapi-fetch`).
- **Backend:** Go 1.23 + Chi, `pgx` puro e SQL explícito (sem ORM), migrações versionadas embutidas, JWT HS256, OTP, `log/slog`.
- **Banco:** PostgreSQL 16, modelo ledger com constraints de unicidade.
- **Infra:** Cloudflare Workers (web), Fly.io região `gru` (API) e Neon (banco) — ambiente de demonstração no ar.

## 6. Diferencial e inovação

- **Zero atrito de hardware:** nenhum beacon, nenhum PDV, nenhum app. O sensor de entrada é o cupom que o visitante já leva.
- **Vínculo, não cupom de desconto:** a mecânica premia **voltar e circular** (lojas e categorias diferentes), que é exatamente o comportamento que o shopping não consegue medir hoje.
- **Requisito sorteado do desafio — APIs em três camadas:** a interface consome 100% a API REST própria e tipada (nenhum dado mockado); o backend consome API externa (SEFAZ-TO) com fallback local obrigatório; e a API é exposta a parceiros (`/v1/offers` e `/v1/metrics/summary`, apenas agregados, com chave de API).

## 7. Viabilidade e aplicação

O modelo de receita é híbrido e não depende de vender mídia no primeiro dia:

| Frente | Como cobra |
|---|---|
| **SaaS white-label** | Assinatura mensal da administração do shopping + setup de implantação |
| **Lojistas** | Fee por transação, cashback patrocinado e campanhas de pontuação turbinada |
| **Retail media** | Vitrine patrocinada, banners e notificações segmentadas dentro do PWA |
| **Dados** | Dashboards analíticos por assinatura e pesquisas de mercado com a base engajada |
| **Parceiros externos** | Postos, cinema e estacionamento pagam adesão para entrar no catálogo de resgates |

Para o shopping, o retorno é operacional antes de ser financeiro: recorrência identificada, cross-shopping mensurável, aumento de permanência e redução de vacância. Para o lojista, é aquisição de cliente sem CAC de mídia paga. Para o visitante, o benefício é imediato e resgatável na mesma visita — a condição para o programa não morrer no primeiro mês.

**Roadmap declarado (fora do MVP):** indicação com crédito para os dois lados, notificações via WhatsApp, campanhas sazonais com dados de clima e leitura de cupom por foto (OCR).

---

**Demonstração:** [raiz.marcio.run](https://raiz.marcio.run) · **API e contrato:** [raiz-api.marcio.run/docs](https://raiz-api.marcio.run/docs) · **Código:** [github.com/marcioecom/raiz](https://github.com/marcioecom/raiz) · **Vídeo (90s):** _(link a ser adicionado)_
