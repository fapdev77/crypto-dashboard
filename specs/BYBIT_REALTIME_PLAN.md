# Bybit Real-Time Update Strategies (BYBIT_REALTIME_PLAN)

## O Problema
Ao contrário da OKX e Bitget, a **Bybit** economiza banda em seu canal privado (`wss://stream.bybit.com/v5/private`). Ela **NÃO** faz pushes de atualizações da carteira ou posição simplesmente porque o preço de mercado (Mark Price) se moveu. O WebSocket privado da Bybit emite eventos apenas mediante alterações de estado transacionais (ex: Ordem Criada/Preenchida, Execução de Stop Loss, Ajuste Manual de Margem, Cobrança de Funding Fee). Isso faz com que a view da Bybit pareça "congelada" em relação às demais, que estouram na tela de atualizações.

Para resolver este "déficit" de frescor de dados, listamos 3 caminhos possíveis de engenharia, para que possamos decidir.

---

## Solução 1: Short-Polling via API REST (Recarregamento Oculto)
Implementar um hook de polling no React (`setInterval`) que faça, silenciosamente em background, a chamada `RestClient.getPositionsBybit()` e `getWalletBybit()` a cada **5 segundos**, sobrescrevendo as posições estáticas.

*   **Implementação:** Muito simples. Todo o mecanismo de `hybridFetch` já está pronto e escalável. Basta fazer um loop.
*   **Vantagens:** 100% de exatidão matemática, inclui descontos de taxas de financiamento (Funding Fee) e reflete a "fonte da verdade". 
*   **Desvantagens:** Atualização "por saltos" (piscadas de 5/5s). Não terá a mesma fluidez hipnótica de um WebSocket.
*   **Limites de API (Rate Limits):** A Bybit permite até 10 a 20 requisições por segundo neste endpoint. Ao requisitarmos a cada 5 segundos (0.2 req/s), estamos extremamente longe do limite de bloqueio.

## Solução 2: WebSocket Público (Tickers) + PnL Engine Local
Abrir uma segunda conexão paralela ao WebSocket **Público** da Bybit (`wss://stream.bybit.com/v5/public/linear`), assinar o canal de `tickers.SYMBOL` em todos os ativos que o usuário detêm na Bybit e recalcular a matemática no lado do cliente.

*   **Implementação:** Mais complexo. Exige abrir novo canal WebSocket. Exige capturar o evento do novo `markPrice` e injetar num motor que calcula: `Unrealized PnL = (MarkPrice - EntryPrice) * Size * Leverage * Direction`. E, somar esse PnLx2 na Wallet Amount.
*   **Vantagens:** Experiência 100% "Real-Time" lisa, na casa dos milissegundos. Zero custo de chamadas rest-api adicionais.
*   **Desvantagens:** Pode apresentar micros de distorções contábeis frente a UI real da Bybit num eventual dia seguinte, devido às taxas de juros (Funding Fees) não estarem no Payload do ticker.

## Solução 3: Abordagem Híbrida Mestre (Recomendada)
Unir a agilidade mecânica da Solução 2 com a veracidade contábil da Solução 1.

*   1. Nós conectamos o **WebSocket Público** (Solução 2) apenas para atualizar a exibição estamática visual de **Preço de Mercado (Mark Price)**, **Variação % (ROE)** e **PnL Estimado** das posições de forma contínua em Milissegundos. Deixando a interface super fluída.
*   2. Em background, nós ativamos um **Long-Polling Periódico de 60 Segundos** via REST API, cujo objetivo seria apenas "consertar/sincronizar" o saldo da carteira (Wallet) e descontar taxas, alinhando qualquer centavo de diferença.

---

## Sugestão de Decisão
**Se você quer agilidade de entrega:** Vamos na **Solução 1** (Short-polling a cada 5s). Resolve o problema em 5 linhas de código sem quebrar a cabeça e atinge excelente resultado.
**Se você quer visual super Premium (Real-Time Puro):** Recomendo a **Solução 3** (ou tentar a Solução 1 provisoriamente, e ver se agrada antes de adicionar complexidade de Frontend Engine).

Aguardando seu veredito de como prosseguir.
