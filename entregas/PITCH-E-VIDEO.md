# Pitch e vídeo — Raiz (HackaRun 2026)

Documento operacional para a apresentação final. Cobre o vídeo de 90s (regra do edital), o pitch ao vivo de 5 minutos com demo, o Q&A e o outline do deck. Nada aqui inventa funcionalidade: tudo descreve o que está implementado e no ar em `raiz.marcio.run` / `raiz-api.marcio.run`.

Regras do edital que valem para o vídeo: um único apresentador (integrante da equipe), sem uso de IA na produção, não é obrigatório mostrar código nem telas. O vídeo precisa responder, nesta ordem: qual é o problema, quem é afetado, qual é a solução, o que é o produto e como ele resolve.

---

## 1. Tese de mensagem

**Posicionamento (uma frase):**
O Raiz transforma o cupom fiscal que o visitante já recebe em identidade de recorrência para o shopping — sem instalar aplicativo e sem integrar com o PDV de nenhuma loja.

**As três mensagens que precisam ficar na cabeça do jurado:**

1. **O shopping mede passagem, não recorrência.** Sem PDV e sem app, ninguém sabe quem voltou, quanto esse visitante movimenta ao longo do ano e como ele circula entre lojas. É esse dado que decide expansão, mix de lojas e campanha.
2. **O cupom fiscal é o único identificador que o visitante já carrega no bolso.** Escanear o QR da NFC-e custa um gesto de três segundos e não muda o caixa do lojista. É a menor fricção possível para identificar alguém de verdade.
3. **Recompensa real na mesma visita fecha o ciclo.** Sementes viram voucher de seis caracteres usado no balcão em dez minutos. Não é cashback, não é sorteio, não é promessa para o mês que vem.

Frase de encerramento, usada no vídeo e no pitch: **"Quem volta, cria raiz."**

---

## 2. Roteiro do vídeo de 90s — take único no celular

Formato escolhido: **sem corte e sem edição**. Uma pessoa filma com o celular; o apresentador fala olhando para a câmera e, no meio do take, opera o app **ao vivo** no segundo celular. Sem OBS, sem espelhamento, sem sincronização. O que garante os 90 segundos é o ensaio, não a edição.

**Por que funciona:** o edital exige um único apresentador e uma explicação clara; não exige gráfico, tela de computador nem corte. Um take contínuo com o app na mão é a prova mais honesta de que o produto funciona — e elimina quase todo o risco de produção.

### 2.1 O que precisa estar pronto antes de gravar (10 min)

- **Dois celulares** carregados: um filma, o outro roda o app (não dá para filmar e operar o mesmo aparelho).
- **Celular do app** com o Raiz instalado na tela de início (PWA), sessão já feita com OTP `000000`, **Não Perturbe ligado**, brilho em 100% e bloqueio automático em 5 minutos.
- **Cupom real de NFC-e** emitido nas últimas 72h, de loja parceira, **ainda não usado** por essa conta (1 por loja/dia, 5 por dia).
- **Saldo suficiente** para ao menos um prêmio barato — o resgate é o momento mais forte do vídeo.
- A **chave de 44 dígitos do mesmo cupom copiada** para a área de transferência: é o plano B do scan.
- Notificações, WhatsApp e e-mail fechados; sem capa atrapalhando o brilho da tela.
- **Uma pessoa filmando** (ou tripé). O enquadramento muda quando o app entra em cena, e isso é mais fácil com alguém segurando.

### 2.2 O take, segundo por segundo (~185 palavras faladas)

| Tempo | Fala | Câmera e ação |
|---|---|---|
| **0–12s** | "O Capim Dourado sabe quantas pessoas entram por mês. Não sabe quem voltou. E é essa diferença que decide se o shopping cria cliente ou só movimento." | Plano médio, horizontal, olhos no terço superior. Sem "olá, somos a equipe". |
| **12–26s** | "Medir isso hoje exigiria integrar com o caixa de cada loja. É caro, é lento, e a maioria dos lojistas não vai fazer. O Raiz mede com o que o visitante já leva na mão: o cupom fiscal." | Mesmo plano. O apresentador levanta o cupom na altura do peito. |
| **26–38s** | "É um aplicativo web, sem instalação. Abre no navegador, escaneia o QR Code da nota, e cada cupom vira sementes: dez de base, mais uma por real gasto." | A câmera aproxima devagar (movimento contínuo) do cupom e do celular. |
| **38–60s** | "Vou fazer agora, ao vivo. [aponta o celular] Escaneando o QR... Cupom aceito. As sementes já entraram na carteira, com a loja e o valor da compra." | Apresentador vira a tela do celular para a câmera e escaneia. Abre a Carteira e mostra o lançamento. |
| **60–80s** | "Esse mesmo cupom avança a missão de três lojas em sete dias. [abre] E aqui está o prêmio mais próximo: o café. [resgata] Voucher de seis caracteres, válido por dez minutos. É isso que ele mostra no balcão." | Mostra a barra da missão e resgata. Segura o voucher enquadrado por 3 segundos. |
| **80–90s** | "Para o shopping, sobra o que ele nunca teve: quem voltou, quanto gasta e entre quais lojas circula. Sem instalar app e sem mexer no caixa de ninguém. Quem volta, cria raiz." | Baixa o celular, volta ao plano médio, fecha olhando para a câmera. |

**Se o QR não ler em 5 segundos:** "Vou digitar a chave do cupom, que é o caminho alternativo." Cola os 44 dígitos e segue. É recurso do produto, não falha — o caminho manual é obrigatório por especificação.

**Se o cupom já tiver sido usado** (a API responde `409`): não comente o erro; diga "esse cupom já pontuou, então vou usar o próximo" e troque o cupom. Por isso vale levar **dois cupons** de lojas diferentes.

### 2.3 Regras do take (o que faz parecer produzido)

- **Horizontal 16:9**, 1080p30. A banca projeta em tela horizontal; vertical perde ~40% da área útil.
- **Uma tomada.** Se errar, reinicia do zero. Grave três takes e escolha o melhor.
- **Áudio pesa mais que imagem:** sala pequena, celular a 40–60 cm da boca, janela fechada, ar-condicionado desligado. Faça um teste de 10s e ouça com fone antes de valer.
- **Luz frontal** (janela de frente ou abajur atrás da câmera), nunca contraluz.
- **Tela do app:** brilho 100%, inclinar o celular 10–15° para fugir do reflexo da lâmpada, câmera a ~40 cm nos momentos de leitura. Narre o resultado ("as sementes entraram") em vez de depender de o jurado ler o número.
- **Sem corte, sem zoom digital, sem transição, sem trilha.** Só voz e produto.
- **Nada de dado real de outra pessoa na tela:** use a conta demo (LGPD).
- **Sem IA em nada:** nem voz, nem avatar, nem legenda gerada. Legenda não é obrigatória.

### 2.4 Depois de gravar (5 min)

- Só dois cortes são permitidos: **início e fim** — nada no meio: `./entregas/obs/editar.sh entrada.mov 1 91`.
- Confira duração (≤90s), áudio e legibilidade no celular **e** numa tela grande.
- Suba no YouTube como **não listado**, com o nome `raiz-video-90s.mp4`, e cole o link no README e no resumo.

---

## 3. Roteiro do pitch ao vivo — 5 minutos

Princípio: o demo ocupa a maior fatia do tempo. Uma demo que funciona vale mais que qualquer slide. Cada bloco tem uma frase que precisa ser dita e uma tela que precisa aparecer.

### Bloco 1 — Problema (0:00–0:40)

**Fala-chave:** "O shopping sabe quantas pessoas passaram. Não sabe quantas voltaram, nem quem são. Sem PDV, esse dado não existe — e integrar com o caixa de cada loja é caro, lento e ninguém quer."

- Não abra com o nome da equipe nem com a stack. Abra com o número que o shopping já tem e com o que ele não tem.
- Se quiser um gancho: "Vocês já entraram no Capim Dourado e receberam um cupom que não servia para nada além de conferir o troco?"
- Slide 2 na tela. Não leia o slide.

### Bloco 2 — Solução e insight (0:40–1:15)

**Fala-chave:** "A gente usa o único identificador que o visitante já tem no bolso: a chave da nota fiscal. Um QR Code, três segundos, e ele existe para o shopping — sem instalar nada e sem mexer no caixa do lojista."

- Diga o que é o produto em uma frase: "Um PWA de fidelização que lê a NFC-e e transforma cada cupom em sementes, missões e recompensa."
- Nomeie o insight: a NFC-e é obrigatória, tem QR impresso e é única por operação. É dado público do ponto de vista do consumidor.
- Slide 3 na tela.

### Bloco 3 — Demo ao vivo (1:15–3:30)

Regra: uma única jornada contínua, narrada em linguagem de usuário. Não navegue por menus, não mostre tela de erro, não explique arquitetura aqui. Tenha os dados colados na área de transferência.

| Tempo | Tela | O que você faz | O que você diz |
|---|---|---|---|
| 1:15–1:35 | **Entrada / OTP demo** | Digita nome e telefone, recebe o código `000000`, entra. | "Cadastro mínimo: nome e telefone. Sem senha, sem instalação. O OTP fixo é modo demonstração, e a tela diz isso." |
| 1:35–1:55 | **Início** | Deixa carregar (skeleton aparece) e mostra saldo, nível e próxima missão. | "Uma chamada só, `GET /v1/home`. Enquanto carrega, skeleton; se falhar, botão de tentar de novo. Nunca tela branca." |
| 1:55–2:35 | **Scan do cupom** | Escaneia o QR do cupom de demo; se a câmera falhar, digita os 44 dígitos na mesma tela. | "Dez sementes de base, mais um por real. O parser valida a chave localmente, com dígito verificador módulo 11, antes de qualquer chamada externa." |
| 2:35–2:55 | **Mesma tela de scan, segunda tentativa** | Repete a mesma chave. | "Mesmo cupom: recusado, sem creditar de novo. A chave é única no banco. Também há teto de um cupom por loja por dia, cinco por dia e janela de 72 horas." |
| 2:55–3:10 | **Carteira / extrato** | Rola o ledger. | "O saldo não é um campo: é a soma do ledger. Cada linha tem origem, tipo e data. Isso é o que permite auditar e mostrar de onde veio cada semente." |
| 3:10–3:30 | **Missões e resgate** | Mostra missão de três lojas progredindo e resgata um voucher. | "Três lojas em sete dias, mais cento e cinquenta. Resgate atômico: o voucher sai com seis caracteres e vale dez minutos no balcão." |

**Plano B — se a demo falhar.** Não peça desculpa duas vezes e não reinicie o notebook na frente da banca. Diga: "A demo ao vivo caiu; vou mostrar o fluxo gravado e sigo com os números." Abra o vídeo de 90s ou uma gravação de tela de 60s já aberta em outra aba e narre por cima, exatamente na mesma ordem das telas. Se nem isso abrir, use os prints do deck (slide 4) e volte ao roteiro: problema, o que o produto faz, o que já está no ar. Frase de recuperação: "O produto está em produção em `raiz.marcio.run`; o que falhou foi a rede da sala, não a jornada." Nunca invente um resultado que não aconteceu.

### Bloco 4 — Como isso é construído + requisito sorteado das APIs (3:30–4:05)

Este é o único momento técnico. Trinta e cinco segundos, três frases, um slide.

**Fala-chave:** "O requisito do desafio era consumo de API em três camadas. A interface é servida cem por cento pela nossa API tipada, gerada do OpenAPI 3.1. O backend consome a SEFAZ-TO com timeout de dois segundos e fallback local — se a SEFAZ cair, o cupom entra do mesmo jeito. E a API é exposta para parceiros: ofertas e métricas agregadas em `/v1/offers` e `/v1/metrics/summary`."

- Mencione de passagem que o CNPJ desconhecido pontua o valor base e entra em fila de revisão, sem erro na tela. É o detalhe que mostra maturidade de produto.
- Não mostre código. Se perguntarem depois, a resposta está no Q&A.

### Bloco 5 — Viabilidade e monetização (4:05–4:45)

**Fala-chave:** "Quem paga não é o visitante. São cinco linhas de receita, e a primeira já paga a operação."

1. **SaaS white-label** para a gestão do shopping, com setup e integração. Receita previsível, contrato anual.
2. **Fee por transação e campanha patrocinada**: lojista paga para turbinar pontuação ou patrocinar resgate.
3. **Retail media**: vitrine patrocinada, banner e push geo-segmentado dentro do app.
4. **Data insights**: dashboard analítico e pesquisa de mercado para a administração e para marcas.
5. **Parcerias externas**: posto, cinema e estacionamento pagam adesão para entrar no catálogo de resgates.

**ROI para o shopping, em uma frase:** fluxo contínuo, dado unificado de recorrência e cross-shopping, menos vacância e mais tempo de permanência. O Raiz não compete com o lojista — entrega cliente recorrente para ele.

### Bloco 6 — Fechamento (4:45–5:00)

**Fala-chave:** "O Raiz está no ar, com ledger, antifraude e resgate funcionando. O próximo passo é um piloto de oito semanas com as lojas parceiras do Capim Dourado. Quem volta, cria raiz."

- Termine com um pedido concreto, não com "obrigado": piloto, acesso à base de lojas ou avaliação para a próxima fase. Agradecer é a última palavra, não a última frase.

---

## 4. Q&A — as 10 perguntas mais prováveis

Responda em duas ou três frases. Se não estiver implementado, diga que não está e coloque no roadmap — a banca desconta menos por escopo honesto do que por exagero.

1. **Isso é viável fora de um hackathon?**
   Sim, porque não depende de integração: a NFC-e é obrigatória e o QR já está impresso no cupom. O custo marginal por transação é baixo e o cliente que paga é o shopping, que já tem orçamento de marketing e de dados.
   *Risco honesto:* depende de adesão das lojas para o catálogo de prêmios.

2. **Como vocês tratam LGPD?**
   Coletamos só nome e telefone, com consentimento registrado com data e hora. O telefone é gravado como hash para busca e cifrado para exibição; CPF do cupom é lido e descartado, nunca persistido. O Perfil tem baixar meus dados e apagar conta, e as métricas para lojista são apenas agregadas.

3. **Por que não integrar com o PDV?**
   Porque é exatamente o que inviabiliza o projeto: cada loja tem um sistema, um contrato e um prazo. O cupom fiscal já é o recibo do PDV, então lemos o resultado da venda pelo lado do consumidor. Integração de PDV é roadmap de enterprise, não pré-requisito para começar.

4. **Por que o QR da NFC-e e não um cartão fidelidade ou app nativo?**
   Porque não exige adesão prévia: o visitante já tem o cupom na mão. App nativo mata a conversão na instalação, e cartão físico custa emissão e logística. Escanear é um gesto de três segundos, e quem não tem câmera digita os 44 dígitos na mesma tela.

5. **Como vocês conseguem adoção se ninguém conhece o app?**
   O gatilho é o benefício imediato no balcão: semente e voucher na mesma visita. A distribuição começa pelas lojas parceiras (cartaz no caixa com o QR do Raiz) e por campanhas de pontuação turbinada. Não é um app para descobrir sozinho; é um app que o lojista apresenta.

6. **Como evitam fraude?**
   Quatro travas: a chave de acesso é única no banco, um cupom por loja por dia, teto de cinco cupons por dia e janela de emissão de 72 horas. O resgate roda em transação, então saldo nunca fica negativo e o código do voucher é único.

7. **Quanto custa operar?**
   A stack é deliberadamente barata: Postgres gerenciado, um binário Go e front estático em CDN. O custo escala com uso, não com número de lojas, e a chamada à SEFAZ é opcional — o fallback local mantém o serviço de pé sem ela.

8. **Qual a diferença de um app de cashback ou de um programa de pontos do shopping?**
   Cashback é dinheiro de volta e exige caixa; pontos de shopping costumam exigir adesão e integração. O Raiz entrega recorrência identificada com recompensa de baixo custo operacional e sem tocar no caixa do lojista. O dado de cross-shopping é o produto; o prêmio é o gatilho.

9. **Isso escala para uma rede de shoppings?**
   Sim, porque o modelo é multi-tenant por natureza: lojas, temporadas e catálogo de prêmios são dados, não código. O primeiro gargalo real é operacional — curadoria de prêmios e relacionamento com lojistas —, não técnico.

10. **O que é MVP e o que é roadmap?**
    **No ar:** login por OTP, scan e digitação da chave, pontuação, ledger, missões de loja e categoria, ritmo de quatro semanas, níveis, ranking da safra, catálogo e resgate com voucher, exclusão de conta e métricas agregadas.
    **Roadmap:** indicação com bônus para os dois lados, notificação por WhatsApp Cloud API, clima no contexto de campanha via OpenWeather, OCR do cupom por foto e painel self-service do lojista.

> Se a pergunta for sobre algo que não está implementado (indicação, WhatsApp, OpenWeather), a resposta começa com "ainda não está no MVP" e termina com o motivo de estar no roadmap. Não improvise uma demo que não existe.

---

## 5. Outline do pitch deck (10 slides)

| # | Título | O que aparece | Mensagem única | Onde entra |
|---|---|---|---|---|
| 1 | **Raiz — quem volta, cria raiz** | Nome, uma frase de posicionamento, URL no ar | "PWA que transforma cupom fiscal em recorrência identificada." | Vídeo (0–5s como cartela) + pitch |
| 2 | **O shopping mede passagem, não recorrência** | Diagrama de fluxo de pessoas x nenhum nome; três lojas com caixas isolados | "Sem PDV, o dado de quem voltou simplesmente não existe." | Vídeo + pitch |
| 3 | **O cupom já é o identificador** | Fluxo em 4 passos: escanear → sementes → missão → voucher na mesma visita | "Três segundos, sem instalação, sem mexer no caixa do lojista." | Vídeo + pitch |
| 4 | **Demo** | Aqui você sai do slide e vai para o app (ou o vídeo de 90s como plano B) | "Funciona de ponta a ponta, agora." | Só pitch (vídeo usa 1–3) |
| 5 | **Por dentro: ledger, não saldo** | Diagrama de `ledger` como fonte da verdade, chave única, teto diário | "Auditável e à prova de cupom repetido." | Só pitch (pode virar uma linha no vídeo) |
| 6 | **APIs em três camadas** | UI → API própria tipada → SEFAZ-TO (2s, fallback) → `/v1/offers`, `/v1/metrics/summary` | "Cumpre o requisito do desafio sem depender de terceiro para funcionar." | Só pitch |
| 7 | **Por que agora** | NFC-e consolidada, QR impresso em todo cupom, visitante com celular na mão | "O insumo já existe; faltava a camada de produto." | Vídeo (opcional) + pitch |
| 8 | **Quem paga** | Cinco fontes de receita em ordem de maturidade, com o ROI do shopping ao lado | "SaaS do shopping, fee de campanha, retail media, dados e parcerias externas." | Só pitch |
| 9 | **Alternativas e o que temos de diferente** | Comparativo: app de cashback, cartão fidelidade, PDV, planilha do shopping | "Menor fricção para o visitante, menor custo para o lojista." | Só pitch |
| 10 | **MVP, roadmap e próximo passo** | Duas colunas (no ar / roadmap) + pedido concreto | "Piloto de oito semanas com as lojas parceiras." | Vídeo (fecho) + pitch |

Regra de desenho: um número grande por slide, no máximo quatro linhas de texto, fonte legível do fundo da sala. Sem logo de tecnologia empilhado, sem print borrado.

---

## 6. Checklists

### 5 minutos antes de apresentar

- [ ] App aberto em `raiz.marcio.run` na aba 1, já logado, com um cupom de demo válido separado.
- [ ] Chave de 44 dígitos colada na área de transferência (a demo não pode depender da câmera).
- [ ] Vídeo de 90s baixado localmente e aberto em outra aba, no ponto zero, com som testado.
- [ ] Deck em modo apresentação, slide 1 na tela, fonte grande o suficiente para o fundo da sala.
- [ ] Segunda aba com `raiz-api.marcio.run/healthz` e `/docs`, caso alguém peça prova de que a API está de pé.
- [ ] Celular com 4G próprio, como rede de contingência.
- [ ] Notificações desligadas no notebook (não modo avião: a demo precisa de rede), Slack e e-mail fechados, notificações do sistema silenciadas.
- [ ] Cabo de energia conectado, brilho em 80%, espelhamento testado na TV do palco.
- [ ] Cronômetro visível para quem não apresenta; combinado de sinal aos 4:15.

### Checklist do vídeo de 90s (take único)

- [ ] **Dois celulares** carregados: um filma, o outro roda o app.
- [ ] **Cupom válido**: NFC-e de loja parceira, emitido <72h, ainda não usado por essa conta; **segundo cupom de reserva** e a chave de 44 dígitos copiada.
- [ ] **App pronto**: PWA na tela de início, sessão demo feita, saldo para um prêmio, Não Perturbe ligado, brilho 100%, sem bloqueio automático.
- [ ] **Duração:** entre 85 e 90 segundos, cronometrado em três tomadas.
- [ ] **Take único:** nenhuma emenda no meio; só início e fim podem ser aparados.
- [ ] **Áudio:** teste de 10s ouvido com fone, sem eco, sem ruído, sem música.
- [ ] **Luz e quadro:** frente iluminada, horizontal 16:9, olhos no terço superior.
- [ ] **Conteúdo:** problema, afetado, solução, produto e como resolve aparecem até 75s.
- [ ] **Regras do edital:** um único apresentador da equipe, nenhuma narração sintética, nada gerado por IA.
- [ ] **Fechamento:** nome do produto e frase final audíveis nos últimos 5 segundos.
- [ ] **Arquivo:** MP4 1080p, `raiz-video-90s.mp4`, YouTube não listado, link no README e no resumo.

---

## 7. Fontes consultadas

- Y Combinator — *How to Pitch Your Company* (Michael Seibel): as sete perguntas, clareza acima de jargão, "email test". https://www.ycombinator.com/library/4b-how-to-pitch-your-company
- Y Combinator — *A Guide to Demo Day Presentations*: não enterrar o lead, ordem dos componentes. https://www.ycombinator.com/blog/guide-to-demo-day-pitches
- Y Combinator — *How to build your seed round pitch deck*: estrutura de 10 slides e o que cada um deve provar. https://www.ycombinator.com/library/2u-how-to-build-your-seed-round-pitch-deck
- Techstars — *Master Your Pitch*: divisão de tempo de um pitch de 5 min (intro 1 min, demo 2–3 min, negócio 1–1,5 min, fechamento 30s). https://toolkit.techstars.com/master-your-pitch
- Techstars — *The Keys to Creating the Perfect 30-Second Pitch*: fórmula "para [cliente] que [problema], nós [produto], para que ele [resultado]". https://www.techstars.com/blog/advice/the-keys-to-creating-the-perfect-30-second-pitch
- 500 Global — *How to Pitch a VC*: tagline de até sete palavras, contar a história do produto, sair da sala com resumo e pedido. https://500.co/content/how-to-pitch-a-vc
- 500 Global — *This Pitch Deck Will Rock Your 500 Global Application*: sequência de slides e o erro de dizer que não há concorrência. https://500.co/content/this-pitch-deck-will-rock-your-500-global-application
- Sequoia Capital (via Lunera) — *Pitch Deck Template*: purpose, problem, solution, why now, market potential, competition, business model, team, financials, vision. https://www.lunera.vc/insights/sequoia-pitch-deck-template
- AngelHack — *10 Hackathon Demo Tips*: em 5 minutos, estenda o demo, não a introdução; o demo ocupa cerca de metade do tempo; tenha gravação de backup. https://angelhack.com/blog/10-tips-to-help-you-rock-your-next-hackathon-demo
- HackTribe — *How to Build a Hackathon Pitch Deck: 5-Minute Structure*: tabela de tempos 0:00–5:00 e 5 a 7 slides. https://hacktribe.co/blog/how-to-build-a-hackathon-pitch-deck-practical-5-minute-structure
- Hackathon Guidebook — *How to create a hackathon pitch*: a demo é evidência da claim de abertura; diga o que é real, o que é mockado e o que vem depois. https://www.hackathon-guidebook.com/deep-dives/pitch
- Builder Base — *Crafting a Demo That Lands*: estrutura de 2 minutos (problema 15–20s, solução 15–20s, demo 60–90s, impacto, pedido). https://intercom.help/builderbase/en/articles/14836128-builder-s-guide-ch-14-crafting-a-demo-that-lands
- Devpost — *6 Tips for making a winning hackathon demo video* / *How to present a successful hackathon demo*: abrir com o pitch, pular fluxos triviais, fechar com impacto. https://info.devpost.com/blog/6-tips-for-making-a-hackathon-demo-video
