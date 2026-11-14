# Product — Raiz

> Contexto estratégico do frontend para o skill `impeccable`. Fonte detalhada: [CONTEXTO_PROJETO.md](./CONTEXTO_PROJETO.md), [REGRAS_NEGOCIO.md](./REGRAS_NEGOCIO.md) e [DESIGN.md](./DESIGN.md).

## Register

product

## Users

Visitante do Capim Dourado Shopping (Palmas-TO), em pé, no corredor, com o cupom na mão e conexão 4G instável. Quer registrar a compra e ver o que ganhou em menos de um minuto, sem instalar aplicativo nem criar senha. Uso secundário: no balcão da loja, mostrando o voucher para o lojista.

## Product Purpose

Criar identidade persistente do visitante a partir do QR Code da NFC-e, transformando cada compra em sementes, missões entre lojas e benefícios reais resgatáveis na mesma visita. Sucesso = cupom válido registrado em menos de 3s, leitura por câmera funcionando no primeiro enquadramento e retorno em 48h.

## Brand Personality

Adulto, regional, direto. Fala como o cerrado: "quem volta, cria raiz". Confiante, sem euforia e sem infantilizar. Nada de comemoração exagerada por ganhar pontos.

## Anti-references

Emoji, mascote, avatar, "moedinha", "parabéns, você subiu de nível", gamificação infantilizada, chatbot enfeite, cashback genérico em reais e qualquer tela que pareça um app bancário.

> **Exceção cosmética documentada:** a marca `<RaizLogo />` possui um easter egg oculto de "Sexta-feira 13" (o modal do Jason em `<JasonScareDialog />`, acionado após 13 cliques com crescimento das raízes e auto-fechamento em 3s, sem emojis e sem impacto em pontos/regras), detalhado em [DESIGN.md](./DESIGN.md).

## Design Principles

1. **Uma decisão por tela.** O caminho crítico (escanear → saldo → resgatar) nunca disputa atenção com o resto.
2. **O polegar manda.** Ação principal sempre ao alcance do polegar, alvos grandes, barra inferior fixa.
3. **Funciona no 4G ruim.** Skeleton, retry explícito, fila offline no scan; nunca tela branca.
4. **Mostrar o real.** Saldo, missão e prêmio vêm da API, com dados demo rotulados como demonstração.
5. **Falar como gente do lugar.** Copy curta, em pt-BR, sem jargão de programa de fidelidade.

## Accessibility & Inclusion

WCAG 2.1 AA: contraste ≥ 4.5:1 no corpo, alvos de toque ≥ 44px, foco visível, `prefers-reduced-motion` respeitado em toda animação e a digitação dos 44 dígitos sempre disponível como alternativa à câmera.
