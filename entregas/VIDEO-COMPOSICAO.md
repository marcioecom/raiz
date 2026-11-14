# Composição do vídeo de apresentação — Raiz (HackaRun 2026)

Documento de **produção**. O roteiro narrativo (o que é falado, em que ordem) fica em outro arquivo. Aqui: como gravar, como compor, como editar e em quanto tempo.

> **Plano B.** O formato escolhido para a entrega é o **take único no celular**, com roteiro em [PITCH-E-VIDEO.md](./PITCH-E-VIDEO.md) §2. Este documento fica como alternativa: composição com o app espelhado no OBS, para usar se sobrar tempo ou se o take único não der certo.

- Formato de entrega: horizontal 16:9, 1920×1080, 30 fps, H.264/MP4, no máximo 90 segundos.
- Um único integrante na câmera. Sem avatar, sem voz sintética, sem clipe gerado por IA.
- O app aparece de verdade (`https://raiz.marcio.run`), nunca recriado ou mockado.

---

## 0. Restrições do edital que definem a produção

1. **90 segundos no total.** Isso é curto: cabem 4 blocos, não 8.
2. **Um apresentador.** Composição com bolha de câmera é permitida; segunda pessoa em tela ou narração de outra voz, não.
3. **Proibido produzir o vídeo com IA.** Interpretação prática e conservadora: nenhuma imagem gerada, nenhum rosto sintético, nenhuma voz clonada/gerada. Legendas automáticas são transcrição do que foi dito, não geração de conteúdo novo — trate como acessibilidade e revise linha por linha (detalhe na seção 5).
4. **Não é obrigatório mostrar código ou telas**, mas mostrar o produto funcionando vale ponto. Logo: o vídeo é sobre o produto e o apresentador, sem tela de IDE.
5. **Antes de exportar, confira no edital**: formato aceito (MP4), resolução mínima, limite de tamanho de arquivo e padrão de nome do arquivo. Se houver divergência com este documento, o edital manda.

---

## 1. Pipeline recomendado

### 1.1 A decisão central: app espelhado no Mac ou iPhone na mão?

| | App espelhado no Mac (recomendado) | iPhone na mão |
|---|---|---|
| Legibilidade do texto | Boa — a janela entra grande no quadro e recebe zoom | Ruim — a tela treme, inclina, reflete luz, texto minúsculo |
| Composição com a webcam | Trivial: gravação de janela + câmera no mesmo take | Precisa de duas câmeras ou dois takes e sincronizar depois |
| Zoom automático (estilo Screen Studio) | Funciona (o clique é clique de mouse) | Não funciona — o toque no dedo não é capturado |
| Sensação de "real" | Boa, mas parece um app rodando no desktop | Alta, porém custa legibilidade e tempo |
| Risco | Espelhamento falhar (tem plano B) | Erro de foco, tremor, notificação pessoal aparecendo |

**Decisão:** gravar o app **espelhado dentro do Mac** e compor com a câmera. O "celular na mão" entra, se der tempo, como um plano de 3 segundos no começo (mostrando o QR code do cupom sendo escaneado) — é o único momento em que o aparelho físico importa para a narrativa.

### 1.2 Ordem de execução, com ferramentas e custo

O caminho desta entrega é **OBS + ffmpeg**: gravação e composição em um único take, sem licença paga, edição final no terminal.

| # | Etapa | Ferramenta | Tempo | Custo |
|---|---|---|---|---|
| 1 | Preparar conta demo, seed carregado e PWA instalada na tela de início | Safari do iPhone | 10 min | R$ 0 |
| 2 | Espelhar o iPhone no Mac | Espelhamento do iPhone (macOS) ou AirPlay para o Mac | 10 min | R$ 0 |
| 3 | Abrir a coleção do OBS, escolher janela/câmera/microfone e conferir as cenas | **OBS** (já instalado) | 10 min | R$ 0 |
| 4 | Gravar tela + câmera + voz no mesmo take, trocando de cena nos 4 momentos | **OBS** | 25 min | R$ 0 |
| 5 | Cortar, nivelar o áudio e exportar 1080p30 | **ffmpeg** (`entregas/obs/editar.sh`) | 10 min | R$ 0 |
| 6 | Legendas queimadas | CapCut, iMovie ou ffmpeg com libass (ver 5.3) | 10 min | R$ 0 |
| 7 | Conferir legibilidade e enviar | — | 5 min | R$ 0 |
| | **Total** | | **~75 min** | **R$ 0** |

Observações:

- **Por que não Screen Studio:** a versão gratuita grava mas **não exporta**; o plano é US$ 29/mês e a entrega é única. O zoom automático dele não compensa uma assinatura para um vídeo.
- **Por que OBS resolve:** ele grava tela espelhada, câmera e voz **no mesmo arquivo**, com a composição já montada. A troca de cena substitui o zoom: um corte seco para o enquadramento ampliado é o mesmo efeito, sem edição depois.
- Se alguém da equipe já tiver licença ativa do Screen Studio ou do CapCut Pro, o caminho encurta — mas a configuração abaixo já está pronta e testável.

### 1.3 OBS: a coleção pronta desta entrega

Arquivo: [`entregas/obs/Raiz-16x9.json`](./obs/Raiz-16x9.json). Canvas 1920×1080, quatro cenas, câmera em bolha e app em moldura.

**Instalar (2 minutos):**

1. Feche o OBS (para ele não sobrescrever a coleção ao sair).
2. Copie o arquivo para a pasta de coleções:
   ```sh
   cp entregas/obs/Raiz-16x9.json ~/Library/Application\ Support/obs-studio/basic/scenes/
   ```
   Ou, com o OBS aberto: menu **Coleção de Cenas → Importar** e escolha o arquivo.
3. Abra o OBS e selecione a coleção **Raiz 16x9**.

**Ligar as três fontes (uma vez só):**

| Fonte | O que fazer |
|---|---|
| `iPhone (Espelhamento)` | Propriedades → **Método: Janela** → escolha a janela do **Espelhamento do iPhone**. Deixe "Capturar cursor" ligado. |
| `Câmera` | Propriedades → escolha a webcam. Se a imagem aparecer esticada, mantenha o tipo de ajuste em "Escala para caber". |
| `Microfone` | Já vem no dispositivo padrão do sistema. Confira o medidor de áudio ao falar; se estiver mudo, escolha o microfone certo em Propriedades. |

**As quatro cenas** (posições em px, origem no canto superior esquerdo):

| Cena | O que mostra | App | Câmera |
|---|---|---|---|
| `1 Apresentador` | só você, plano médio | oculto | 1280×720 em (320, 180) |
| `2 App + camera` | app inteiro + bolha | 407×881 em (140, 100) | 520×293 em (1336, 723) |
| `3 Zoom topo` | app a 1,9x, parte de cima (saldo, missão) | 773×1673 em (574, -140) | 520×293 em (1336, 723) |
| `4 Zoom base` | app a 1,9x, parte de baixo (extrato, voucher) | 773×1673 em (574, -593) | 520×293 em (1336, 64) |

Ajuste fino é esperado: se a janela espelhada vier com outra proporção, arraste as alças no preview até o app ficar legível. O que importa é o app ocupar ~76–82% da altura no plano geral.

**Atalhos para trocar de cena sem olhar:** Configurações → **Atalhos** → grupo *Cenas* → atribua `1`, `2`, `3`, `4` (ou `F1`–`F4`). Trocar de cena durante a gravação gera **corte seco** — que é exatamente o efeito de zoom desejado. Não use transição.

**Configurações de gravação (Configurações → Saída):**

- Modo **Simples**, gravação em **1920×1080, 30 fps** (Configurações → Vídeo).
- Qualidade de gravação **Alta qualidade** (não "Pequeno": borra o texto do app).
- Formato **MP4** ou **MOV**, destino `~/Movies/Raiz`.
- Áudio 48 kHz, 192 kbps.

**Permissões do macOS** (Ajustes do Sistema → Privacidade e Segurança): o OBS precisa de **Gravação de Tela**, **Câmera** e **Microfone**. Sem isso, a fonte aparece preta e o áudio fica mudo.

**Gravação:** um take inteiro, com as trocas de cena no tempo do roteiro. Como tela, câmera e voz entram no mesmo arquivo, **não existe sincronização para fazer**. Se preferir gravar o pitch em outro momento, bata **uma palma** no início de cada take: o pico de áudio é o ponto de alinhamento.

**Edição final:** [`entregas/obs/editar.sh`](./obs/editar.sh) corta, normaliza o áudio para -16 LUFS e exporta 1080p30 com `faststart`:

```sh
./entregas/obs/editar.sh ~/Movies/Raiz/entrada.mov 4 94
# saída: ~/Movies/Raiz/entrada-final.mp4
```

Se houver legenda `.srt`, ela entra como 4º argumento e é queimada **quando o ffmpeg da máquina tem libass** — este build do Homebrew não tem (o script avisa e segue sem legenda).


---

## 2. Composição visual em 16:9

### 2.1 Layout sugerido (1920×1080)

```
┌──────────────────────────────────────────────────────────────┐
│  margem 5% (96 px)                                           │
│                                                              │
│   ┌───────────────┐                                          │
│   │               │      área livre / respiro                │
│   │  moldura do   │      (fundo do OBS: #0F1211)             │
│   │  celular com  │                                          │
│   │     o app     │                         ┌──────────────┐ │
│   │               │                         │   câmera     │ │
│   │  altura ~     │                         │  bolha 25%   │ │
│   │  800-860 px   │                         └──────────────┘ │
│   └───────────────┘                                          │
│                                                              │
│        "legenda em duas linhas, 36 px, barra escura"         │
│  ────────────────────────────────────────── margem 8% ─────  │
└──────────────────────────────────────────────────────────────┘
```

- **Moldura do celular:** altura entre **76% e 82% do quadro** (820–880 px), alinhada à esquerda com margem de 120–160 px. Não centralize: o centro é onde a legenda e o olhar do apresentador competem.
- **Câmera:** bolha **inferior direita**, 24–28% da largura (460–540 px), margem de 64 px, raio alto, rosto enquadrado do peito para cima. Ela nunca cobre o elemento que está sendo mostrado — nas cenas de zoom da coleção, a câmera sobe para o canto superior direito justamente para liberar o voucher.
- **Legendas:** faixa inferior, 1 a 2 linhas, **34–40 px** em 1080p, fundo escuro semitransparente, alinhadas ao centro, dentro da margem de 8% inferior.
- **Margens seguras:** 5% nas laterais, 8% embaixo. Nada de texto encostado na borda.
- **Fundo:** preto/carvão ou gradiente sutil do cerrado. Evite wallpaper colorido: a UI do app já tem cor.

### 2.2 O texto do app precisa ser legível

Regra prática: **o texto mais importante da cena deve ter altura de caixa de pelo menos 2,5% da altura do quadro** (~27 px em 1080p). Em um celular de 390 pt de largura reduzido a 400 px de largura, corpo de 14 pt vira ~13 px e some na projeção.

Consequência: **não tente mostrar telas inteiras de texto**. Escolha 4 momentos e dê zoom neles:

1. saldo de sementes (número grande);
2. extrato/ledger com o cupom creditado;
3. missão concluída;
4. voucher com o código de 6 caracteres.

Para o resto (home, navegação), o enquadramento cheio basta: o objetivo é mostrar que o app existe e funciona, não que o visitante lê o menu.

### 2.3 Por que 16:9 e não 9:16

A banca vai projetar em tela horizontal, muitas vezes em sala com projetor e som ruim. Um vídeo vertical projeta com tarjas laterais: perde-se ~40% da área útil, o apresentador vira um selo e o texto não ganha nada em troca. 9:16 só faz sentido para redes sociais depois do hackathon — e um corte vertical pode ser feito do mesmo arquivo no CapCut, se quiserem.

### 2.4 O que não fazer

- Zoom acima de ~2x sobre a tela espelhada: o espelhamento já chega comprimido; ampliar mostra artefato e borra o texto.
- Cortar a status bar no meio do enquadramento (parece bug). Se precisar esconder, use máscara no rodapé/topo do quadro, não no meio.
- Câmera cobrindo o saldo, a missão ou o voucher.
- Duas ou três coisas se movendo ao mesmo tempo (zoom + cursor + bolha + legenda animada).
- Cursor grande com rastro e clique com efeito de explosão em todos os toques.
- Transição diferente em cada corte; corte seco resolve 90% do vídeo.
- Música de fundo alta. Em banca, voz limpa sem música é mais seguro. Se usar, -28 a -30 dB sob a fala.

---

## 3. Como colocar o celular na tela (passo a passo)

### 3.1 Antes de tudo: verificar o que o seu Mac suporta

- Versão do macOS: menu Apple → **Ajustes do Sistema → Geral → Sobre**.
- Versão do iOS: **Ajustes → Geral → Sobre**.
- Existe o app **Espelhamento do iPhone**? Procure em Finder/Spotlight. Ele só existe no **macOS 15 (Sequoia) ou superior**, em Mac com Apple silicon ou chip T2, com **iOS 18+**.
- Se o Mac for mais antigo: use **AirPlay para o Mac** (macOS 12+, Mac de 2018 em diante) ou o caminho USB do QuickTime.

### 3.2 Caminho A — Espelhamento do iPhone (preferido)

Requisitos: mesma conta Apple com verificação em duas etapas nos dois aparelhos; Wi-Fi e Bluetooth ligados; iPhone **bloqueado e perto** do Mac; o Mac não pode estar usando AirPlay, Sidecar ou Câmera de Continuidade ao mesmo tempo; recurso **indisponível na União Europeia** (irrelevante aqui).

1. Abra **Espelhamento do iPhone** no Mac (Dock, Finder ou Spotlight).
2. Na primeira vez, desbloqueie o iPhone com o código. Autorize ou recuse notificações do iPhone no Mac — **recuse**, para não aparecer mensagem na gravação.
3. Ajuste o tamanho da janela: menu **Visualizar → Maior** (ou `Cmd +`). Janela grande = mais pixels para o zoom.
4. Você controla o app com mouse e teclado do Mac. As trocas de cena do OBS substituem o zoom automático: corte seco para o enquadramento ampliado.

Limitações que importam para a produção:

- A câmera e o microfone do iPhone **não ficam disponíveis** nesse modo. O apresentador tem que ser gravado pela webcam do Mac (ou câmera USB). Não tente usar o iPhone como webcam junto com o espelhamento.
- O iPhone fica bloqueado durante o espelhamento — não dá para segurar o aparelho e tocar na tela ao mesmo tempo. Se quiser o plano do "celular na mão", grave separado.

### 3.3 Caminho B — AirPlay para o Mac (quando as contas Apple são diferentes)

1. No Mac: **Ajustes do Sistema → Geral → AirDrop e Continuidade → Receptor do AirPlay**: ligar e definir "Permitir AirPlay para: Qualquer pessoa na mesma rede".
2. No iPhone: **Central de Controle → Espelhar Tela → escolher o Mac**. Pode pedir um código de 4 dígitos exibido no Mac.
3. A janela do AirPlay é **somente visualização**: você toca no próprio iPhone. Vantagem: o gesto real acontece na sua mão, se a câmera pegar. Desvantagem: sem dados de clique, então os zooms são manuais.

### 3.4 Caminho C — USB (mais estável, mais chato)

QuickTime Player → **Arquivo → Nova Gravação de Filme** → seta ao lado do botão de gravar → **Câmera: iPhone**; **Microfone: microfone do Mac** (o QuickTime grava uma fonte de áudio por vez). Serve como backup e como captura de segurança.

### 3.5 Deixar a tela apresentável

- **Não Perturbe** ligado nos dois aparelhos; no iPhone, também desative "Mostrar Prévia" de notificações.
- Home screen limpa: sem badges, sem apps pessoais na primeira página, sem widget com nome de contato.
- Abrir a PWA (instalada na tela de início, sem barra do Safari) já logada na **conta demo**.
- Fechar abas e o leitor do Safari; conferir se não há histórico/aba pessoal visível.
- Bateria acima de 50% e, de preferência, **carregando** (evita o alerta de 20% no meio do take).
- Definir claro/escuro uma vez e não mudar no meio da gravação.
- Celular conectado ao carregador fora do quadro, com o cabo escondido.

### 3.6 LGPD e dados sensíveis na tela

- Use **somente a persona de demonstração do seed**, nunca o telefone ou nome de alguém da equipe.
- Se a tela de Perfil aparecer, confira o que aparece nela. O OBS não tem blur de tela pronto: o mais rápido é simplesmente não mostrar o Perfil no vídeo, ou desfocar o trecho no CapCut/iMovie depois.
- Nunca deixe visível o número do cupom de outra pessoa, e-mail, notificação de WhatsApp ou nome de contato.
- Ao final, encerre a sessão demo no iPhone se o aparelho for voltar para uso pessoal.

### 3.7 Faça um teste de 10 segundos

Antes do take real: grave 10 s, reproduza **com som**, confira enquadramento, legibilidade e microfone. Só então comece. Um take de teste barato evita 20 minutos perdidos.

---

## 4. Zoom e ênfase

### 4.1 O que merece zoom (máximo 4 por vídeo)

| Momento | O que enquadrar | Zoom |
|---|---|---|
| Cupom aceito | confirmação e sementes creditadas | 1,6x |
| Carteira | saldo total em sementes | 1,8x |
| Missão | missão concluída e o bônus | 1,6x |
| Resgate | voucher com os 6 caracteres | 1,8x |

Duração de cada zoom: 2 a 4 segundos, com entrada e saída suaves. Entre um zoom e outro, **volte ao enquadramento cheio** — o olho precisa de referência para entender que houve aproximação.

### 4.2 OBS: troca de cena no lugar do zoom

Como a coleção já tem quatro enquadramentos prontos, o "zoom" é uma troca de cena durante a gravação:

- **Plano geral** (`2 App + camera`) para navegação: home, scan, transição entre telas.
- **Zoom topo** (`3 Zoom topo`) quando o saldo ou a missão estão na parte de cima da tela.
- **Zoom base** (`4 Zoom base`) para o extrato e para o voucher de 6 caracteres.
- **Apresentador** (`1 Apresentador`) na abertura e no fecho.

Regras para o corte funcionar:

- **Corte seco**, nunca transição: o olho entende a troca de enquadramento como zoom.
- Antes de trocar para o zoom, deixe o elemento **centralizado** na tela do app (role até ele). O zoom é um recorte central; o que estiver na borda desaparece.
- Fique **2 a 4 segundos** no zoom e volte ao plano geral entre um momento e outro.
- Não troque de cena enquanto fala uma frase que depende da anterior: troque na pausa.

Se precisar de movimento suave em vez de corte, aí sim vale editar depois (keyframes de escala) — mas para 90 segundos o corte resolve e economiza meia hora.

### 4.3 Se for editar depois (gratuito)

- **CapCut (grátis):** keyframes de escala no painel de propriedades; exporta 1080p/4K. Cuidado: recursos marcados com ícone **Pro** bloqueiam a exportação inteira — confira a timeline antes de exportar.
- **iMovie (nativo):** Ken Burns dá o movimento, mas só em imagem; para vídeo, use o recorte/zoom do clipe e a transição "corte".
- **DaVinci Resolve (grátis):** Inspector → Transform → Zoom com dois keyframes e interpolação "Ease In and Out"; exporta até 4K60 sem marca d'água. Não passe de ~150% de zoom sobre a fonte.

---

## 5. Áudio

### 5.1 Captação

Ordem de preferência:

1. **Microfone USB ou lapela** na gola, 15–20 cm da boca, fora do quadro. Melhor custo-benefício de qualidade por minuto.
2. **Fone com microfone** (AirPods e similares) a 30–50 cm. Aceitável; soa levemente abafado.
3. **Microfone da webcam do Mac.** Último recurso: capta teclado, eco e ar-condicionado.
4. **Microfone do iPhone à distância.** Não. O iPhone fica longe e capta a sala, não a voz.

Grave a fala **no mesmo take** da imagem, pelo OBS. Para 90 segundos, refazer o take inteiro é mais rápido do que sincronizar voz depois. Se preferir gravar a voz separada (mais controle de ritmo), grave a tela sem falar, depois a voz, e alinhe a primeira sílaba com o primeiro gesto — ou bata uma palma no início dos dois takes.

### 5.2 Nível e limpeza

- Pico de fala entre **-12 e -6 dBFS**; loudness médio em torno de **-16 LUFS**; **true peak -1 dB**. Se não tiver medidor, use o alvo do próprio editor e confira no alto-falante do notebook e no fone.
- **Sem música** ou música em -28/-30 dB sob a voz.
- Sala pequena, com cortina/sofá/manta (menos eco). Evite cozinha, corredor e sala vazia.
- Limpeza: o OBS tem o filtro **Redução de Ruído** (RNNoise) na engrenagem de áudio do microfone; CapCut tem redução de ruído e "enhance"; DaVinci tem EQ e limpeza básica no Fairlight (denoise avançado é versão Studio). Use o mínimo — voz processada demais soa artificial.
- Grave com fone de ouvido para não vazar áudio do alto-falante no microfone.

### 5.3 Legendas queimadas

Por que valem: a banca assiste em auditório com som ruim, às vezes no notebook sem caixa de som, e a legenda garante que o argumento chegue mesmo sem áudio. Também derruba objeção de "não entendi o nome do produto".

Sobre o edital: legenda automática **não é "produzir o vídeo com IA"** — é transcrição do que o integrante falou, a mesma função de acessibilidade do Meet/Zoom. Ainda assim, seja conservador:

- A **voz e a imagem são 100% do integrante**. Nada de voz sintética, dublagem, tradução automática ou avatar.
- Gere a legenda automática e **revise linha por linha**. Nomes próprios erram sempre: "Raiz", "Capim Dourado", "sementes", "voucher", nomes de loja.
- Se houver qualquer dúvida da comissão, **digite a legenda manualmente** a partir da transcrição e descarte o arquivo automático. Custa 10 minutos e elimina o risco.
- Estilo: 34–40 px, até 2 linhas, alto contraste, sem emoji, sem palavra destacada em cor diferente a cada linha.
- Ferramenta: CapCut e iMovie geram a legenda e permitem revisar; o `ffmpeg` desta máquina **não** tem o filtro `subtitles` (build sem libass), então o script de edição avisa e exporta sem legenda. Se quiser legenda por linha de comando, instale um ffmpeg com libass e passe o `.srt` como 4º argumento de [`entregas/obs/editar.sh`](./obs/editar.sh).

---

## 6. Checklist e plano B

### 6.1 Antes de gravar

- [ ] Edital conferido: duração, formato, resolução, limite de tamanho, nome do arquivo.
- [ ] Conta demo criada, seed carregado, cupons/missões/prêmios disponíveis para a demo.
- [ ] PWA instalada na tela de início e logada.
- [ ] Espelhamento conectado, janela no tamanho máximo.
- [ ] Câmera, luz e microfone testados (10 s com som).
- [ ] Não Perturbe nos dois aparelhos; notificações do iPhone negadas no Mac.
- [ ] Home screen limpa; abas do Safari fechadas; nenhum dado pessoal em tela.
- [ ] Bateria > 50% e carregando; cabo fora do quadro.
- [ ] Roteiro com as 4 frases-chave colado **fora** da área gravada.

### 6.2 Durante

- [ ] Gravar 2 ou 3 takes completos; não tentar salvar take com erro no meio.
- [ ] Pausar 1 segundo antes e depois de cada ação (dá margem para cortar).
- [ ] Se errar a fala, continuar e recomeçar a frase — não parar a gravação.
- [ ] Não mexer no mouse fora do app; o zoom automático segue o clique.

### 6.3 Depois

- [ ] Cortar para no máximo 90 s (idealmente 85–88 s).
- [ ] 4 zooms, cada um com entrada e saída suaves.
- [ ] Legendas revisadas, dentro da margem segura.
- [ ] Áudio nivelado; ouvir em fone e no alto-falante do notebook.
- [ ] Export 1080p30, H.264.
- [ ] Assistir ao arquivo final em um celular e em uma tela grande: o texto-chave é legível?
- [ ] Backup em nuvem e nome do arquivo conforme o edital.

### 6.4 Plano B (se o espelhamento falhar)

1. **AirPlay para o Mac** (seção 3.3) no lugar do Espelhamento do iPhone.
2. **Gravar o iPhone por USB no QuickTime** (Arquivo → Nova Gravação de Filme → escolha o iPhone como câmera). Você ganha a tela limpa, mas sem composição com a webcam — o pitch teria de ser gravado em outro take e sincronizado pela palma.
3. **iPhone na mão + gravação da tela pelo iPhone** (Central de Controle) e composição no CapCut: recorte, escala com keyframes, câmera como PIP. Custa 20 minutos a mais e piora a legibilidade — só se as opções 1 e 2 falharem.
4. **Só o apresentador + capturas estáticas reais do app** em produção, com movimento lento de escala (105–110%) e corte seco. Diga na narração que são telas do app em produção. Uma captura real é evidência do produto, não mock — mas não pode ser vendida como gravação ao vivo.

---

## 7. Tempo real e cronograma de 90 minutos

Tempo realista por etapa (com uma pessoa operando e uma apresentando):

| Etapa | Realista | Se der errado |
|---|---|---|
| Conta demo + seed + PWA instalada | 10 min | 20 min |
| Espelhamento + higiene de notificações | 10 min | 25 min |
| Teste de 10 s e ajuste de luz/enquadramento | 5 min | 10 min |
| 3 takes completos com troca de cena | 20 min | 35 min |
| Edição: escolher o take e cortar (composição já vem do OBS) | 10 min | 20 min |
| Áudio + legendas | 15 min | 25 min |
| Export + conferência + envio | 10 min | 15 min |
| **Total** | **~90 min** | **~2h40** |

### Cronograma de 90 minutos

| Janela | O que acontece | Dono |
|---|---|---|
| 0–10 | Conta demo, seed, PWA instalada, edital relido | quem opera |
| 10–20 | Espelhamento no ar, notificações off, janela no tamanho máximo | quem opera |
| 20–30 | Teste de 10 s, luz, microfone, enquadramento, ensaio em voz alta | os dois |
| 30–50 | 3 takes completos (o apresentador não assiste entre takes) | apresentador |
| 50–60 | Edição: escolher o melhor take, cortar para 88 s no `editar.sh` | quem opera |
| 60–70 | Conferir as trocas de cena e refazer só o bloco que ficou ruim | os dois |
| 70–80 | Nivelar áudio, limpar ruído, gerar e revisar legendas | quem opera |
| 80–87 | Export 1080p30 e conferência em celular + tela grande | os dois |
| 87–90 | Upload, backup, nome do arquivo conforme edital | quem opera |

Regra de ouro: **se faltar tempo, corte zooms antes de cortar legendas, e corte legendas antes de cortar áudio limpo.** Um vídeo sem zoom é aceitável; um vídeo com áudio ruim ou texto ilegível não é.

---

## 8. Fontes consultadas

- Screen Studio — home e guias oficiais: gravação de iPhone via USB, câmera, zoom manual, proporção, exportação.
  https://screen.studio/ · https://screen.studio/guide/recording-iphone-ipad · https://screen.studio/guide/camera · https://screen.studio/guide/manual-zoom · https://screen.studio/guide/aspect-ratio · https://screen.studio/guide/explanation-of-export-settings
- Screen Studio — preços (US$ 29/mês, US$ 108/ano, 40% educação, sem licença vitalícia, sem reembolso, gravação/edição grátis sem export), checados em out/2026:
  https://smoothrecorder.com/blog/screen-studio-pricing · https://cursorclip.com/blog/cursorclip-vs-screenstudio/ · https://matte.app/blog/screen-studio-review
- Apple — Espelhamento do iPhone (requisitos, tamanhos de janela, indisponibilidade na UE, câmera/mic indisponíveis):
  https://support.apple.com/en-us/120421 · https://support.apple.com/en-us/108046
- Apple — AirPlay para o Mac (macOS 12+, modelos, Receptor do AirPlay):
  https://support.apple.com/guide/mac-help/stream-video-and-audio-with-airplay-mchld7e543a0/mac · https://support.apple.com/en-us/108046
- Apple — QuickTime: gravar filme com iPhone conectado (Camera/Microphone, qualidade):
  https://support.apple.com/guide/quicktime-player/record-a-movie-qtp356b55534/mac
- Comparativo dos caminhos de captura do iPhone e o limite de uma fonte de áudio por vez no QuickTime:
  https://www.clevera.ai/blog/record-iphone-screen-on-mac · https://osxdaily.com/2016/02/15/howto-record-iphones-screen-mac-quicktime/
- Limitações e compressão da janela do Espelhamento do iPhone:
  https://www.howtogeek.com/iphone-mirroring-mac-missing-feature/ · https://www.screensei.com/record-iphone
- DaVinci Resolve — zoom por keyframes, Dynamic Zoom e o que a versão gratuita limita:
  https://poindeo.com/blog/zoom-in-on-davinci-resolve · https://koldflux.com/learn/video-editing/effects-and-transitions/zoom-in-in-davinci-resolve · https://www.storyblocks.com/resources/tutorials/davinci-resolve-free-vs-studio
- CapCut — auto legendas, keyframes e o que exige Pro na exportação:
  https://cutroom.editorialdeskmedia.com/guides/capcut-desktop-beginner-guide · https://capsai.co/blogs/capcut-auto-captions-free-in-2026
