# Architecture Overview (ARCH_OVERVIEW)

## 1. Purpose (O Porquê)
O **Crypto Portfolio Manager** soluciona o problema de fragmentação de informações no trading de criptomoedas. Ele consolida, em tempo real, saldos de carteiras, histórico financeiro e posições de derivativos de três exchanges isoladas (Bitget, Bybit, OKX) sob uma interface de "painel único de vidro" (Single Pane of Glass). O objetivo central é fornecer velocidade analítica e uma postura de segurança *Zero-Trust*, garantindo que as chaves de API do usuário nunca sejam armazenadas em servidores terceiros, operando estritamente localmente no navegador.

## 2. System Map
O sistema utiliza um padrão **Hybrid-Proxy Client Architecture (2-Tier Local)**. Não há banco de dados ou backend de persistência.

*   **Tier 1: Frontend SPA (React/Zustand)**
    *   **Responsabilidade:** Renderização, roteamento stateful, persistência de chaves (`localStorage`) e processamento criptográfico pesado.
    *   **Fluxo de Dados:** Mantém conexões WebSocket diretas abertas simultaneamente para a OKX e Bybit. Para a Bitget, utiliza o Proxy local para contornar limitações de Origin.
*   **Tier 2: Dumb CORS Proxy (Node/Express)**
    *   **Responsabilidade:** Servidor Express estritamente local rodando em conjunto com o frontend (via Vite Middleware no desenvolvimento ou build estático em produção). 
    *   **Fluxo de Dados:** Ele atua como um roteador de *bypass* para contornar restrições severas de Origin/CORS dos navegadores ao realizar chamadas HTTP REST (ex: Histórico de Posições de 90 dias) e serve como proxy de WebSocket **exclusivamente para a Bitget** (que bloqueia conexões WS do navegador).

## 3. Dependency Graph e Identificação de Riscos
A stack atual repousa sobre fundações modernas, porém com alguns pontos críticos de acoplamento:

*   **Core:** React 19.0, TypeScript, Vite 6.2, TailwindCSS v4.
    *   *Risco:* Tailwind v4 acabou de ser lançado (estágio inicial de adoção). Algumas bibliotecas de componentes ainda não são totalmente compatíveis.
*   **State Management:** Zustand 5.0.
    *   *Risco:* Uso intensivo de assinaturas diretas ao estado nos *hooks* de WebSockets (`dashboardStore.getState()`) ao invés do fluxo reativo puro do React, o que é eficiente mas propenso a dessincronização visual se não controlado corretamente.
*   **Security & Crypto:** `window.crypto.subtle`.
    *   *Risco (Mitigado):* Utiliza de forma profunda a API Web Crypto nativa do navegador (`window.crypto.subtle`) para assinar requests (HMAC-SHA256). Isto substituiu efetivamente bibliotecas de grande tamanho e pouco atualizadas, garantindo performance de computação criptográfica nativa.
*   **Networking:** `axios` (REST), WebSockets Nativos, `http-proxy-middleware`.
