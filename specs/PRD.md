# Crypto Portfolio Manager — Product Requirements Document (PRD)

> **Versão do Documento:** 2.16.0  
> **Status:** Aprovado & Em Produção  
> **Produto:** Crypto Portfolio Manager (CPM) — Multi-Exchange Terminal  
> **Testes Automatizados:** 65 arquivos de teste, 660 testes passando (Vitest v8)

---

## 1. Resumo Executivo

O **Crypto Portfolio Manager (CPM)** é um terminal de inteligência analítica, consolidação patrimonial e auditoria contábil para operadores de derivativos de criptomoedas. Ele unifica, em tempo real, dados de três grandes corretoras globais (**Bitget**, **Bybit** e **OKX**) sob uma interface única, ágil e customizável ("Single Pane of Glass").

O produto combina alta performance analítica (gráficos de Open Interest, Cumulative Volume Delta, regimes de mercado, funding arbitrage, gestão delta-neutral em contratos inversos no **Hedge Pro** e o assistente quantitativo **PIKA**) com uma postura intransigente de segurança **Zero-Trust**: todas as credenciais de API permanecem exclusivamente no navegador do usuário (`localStorage`), protegidas por criptografia nativa **Web Crypto API (PBKDF2 com 100.000 iterações + AES-GCM 256-bit)**. O backend em Node/Express atua puramente como um relé inerte para contornar restrições de CORS sem conhecer, registrar ou adulterar segredos.

---

## 2. Problema de Mercado

Traders e gestores de criptoativos que operam simultaneamente em múltiplas corretoras enfrentam:

1. **Fragmentação Extrema de Informações**: Saldos, posições de futuros e históricos de liquidação espalhados em interfaces proprietárias e desconexas.
2. **Incerteza no Risco de Hedge e Delta-Neutral**: Dificuldade em calcular com precisão a proteção real de capital proporcionada por contratos inversos (COIN-M) versus contratos lineares (USDT-M), arriscando sobre-exposição e liquidações em cascata.
3. **Opacidade Contábil e de Taxas**: Dispersão de taxas de corretagem (trading fees), taxas de financiamento (funding fees), saques, depósitos e liquidações forçadas.
4. **Vulnerabilidade de Segurança em Soluções SaaS**: Plataformas convencionais de gestão de portfólio exigem envio de chaves de API para servidores na nuvem, criando vetores catastróficos de vazamento de credenciais.

---

## 3. Objetivos do Produto

| Objetivo | Descrição |
|---|---|
| **Consolidação em Tempo Real** | Unificar saldos, ordens, posições e históricos de Bitget, Bybit e OKX em uma única interface reativa com curto intervalo de polling. |
| **Zero-Trust Client Security** | Manter todas as credenciais criptografadas no navegador; o backend atua como relé inerte com validação de allowlist contra SSRF. |
| **Inteligência Quantitativa Integrada** | Prover scanners de arbitragem de funding, rastreamento de CVD, detecção algorítmica de regimes de mercado e auditoria assistida por IA (**PIKA**). |
| **Gestão de Risco Delta-Neutral (Hedge Pro)** | Modelar com precisão matemática (Beyond-100% Model) o capital protegido e exposto em contratos inversos (COIN-M). |
| **Auditoria Contábil Rigorosa** | Extrair históricos transacionais contínuos de até 2 anos com reconciliação matemática de fluxo de caixa (`cashFlow + funding - fee`). |
| **Governança de Armazenamento Local** | Controlar a quota de disco do navegador e oferecer janelas de retenção configuráveis com ação de expurgo ("Prune History"). |

---

## 4. Público-Alvo e Personas

- **Trader Quantitativo & Arbitrador de Funding**: Busca discrepâncias de taxas entre Bybit, OKX e Bitget para abrir operações delta-neutras e capturar retornos anualizados (APR).
- **Gestor de Portfólio / Hedger**: Utiliza posições vendidas em contratos inversos (COIN-M) para travar o valor em USD dos criptoativos e proteger a custódia patrimonial.
- **Trader Ativo de Futuros Perpétuos**: Necessita monitorar dezenas de posições simultâneas com alertas de liquidação, cálculo de ROE% e visualização de fluxo de ordens (CVD).
- **Auditor Fiscal e Contábil**: Demanda extratos estruturados de fluxo de caixa, histórico de taxas pagas e exportação em PDF, Excel (.xlsx) e CSV.
- **Usuário com Rigor de Privacidade**: Utiliza o Modo Privacidade para ofuscar valores nominais em transmissões e gravações de tela.

---

## 5. Escopo do Produto

### 5.1. Suportado (In Scope)
- **Exchanges Integradas:**
  - **Bybit:** API V5 (Unified Trading Account), suporte a Mainnet e Testnet, roteamento multi-regional (Global, Holanda, Turquia, Hong Kong, Cazaquistão, Geórgia) e injeção automática de cabeçalhos de conformidade para Brasil (`x-site-id: 10001`) e Argentina (`x-site-id: 10002`).
  - **Bitget:** API V2 com adaptadores dedicados para contas **Classic** (Mix/Futures e Spot) e **UTA** (Unified Trading Account), precificação dinâmica de moedas via Spot Tickers, suporte a subcontas e inclusão seletiva da carteira de financiamento.
  - **OKX:** API V5 com suporte a contas unificadas de trading e carteiras de funding (Dual-Wallet) com segregação visual e tags `UNIFIED` e `FUNDING`.
- **Módulos Operacionais e Analíticos:**
  - Dashboard consolidado com Positions Ticker contínuo no topo.
  - Hedge Pro Dashboard com modelo Beyond-100% de capital protegido/exposto e alertas de sobre-exposição.
  - Open Positions com modos de exibição Detailed e Lite.
  - Closed Positions com análise estatística (Win Rate, Profit Factor, avg trade).
  - Order Reports (Open Orders e Order History com busca regex).
  - Trade History com discriminação de liquidez Maker/Taker e fees.
  - Histórico de Transações Multi-Corretora com 10 categorias universais e modais com Total Stats Summary.
  - **Consolidated Net Change Dashboard**: Painel posicionado como primeiro item de Transactions History com 4 macro KPI cards, agrupamento hierárquico por exchange e moeda, e exportação multiformato.
  - **Portfolio Performance Dashboard**: Painel posicionado no topo de Analytics com evolução patrimonial (duplo gráfico de saldo e resultado acumulado), análise temporal por mês e dia da semana, marcos de preço, resultados primários, análise de taxas/arrasto e métricas avançadas (Profit Factor, Win Rate, Índice de Consistência).
  - Market Analytics com Open Interest, Regimes de Mercado, Arbitragem de Funding, CVD e Inverse Coin-M Dashboard.
  - Funding Fees Dashboard com somatórios pré-calculados no serviço e comparador horizontal.
  - PIKA Assistant com 9 ferramentas de leitura, auditoria de compatibilidade de modelos, telemetria de tokens e exportação de logs.
  - Progressive Web App (PWA) instalável com Service Worker e cache offline.
  - Migração Obrigatória de Vault para formatos de criptografia PBKDF2/AES-GCM.

### 5.2. Não Suportado (Out of Scope)
- Envio de ordens de negociação ativas (compra/venda) a partir do CPM — o terminal opera em **estrito modo de leitura e auditoria (Read-Only)**.
- Armazenamento em nuvem de históricos privados do usuário.
- WebSockets para dados financeiros sensíveis (REST Polling near real-time para compatibilidade serverless).

---

## 6. Regras de Negócio e Princípios Arquiteturais

### 6.1. Segurança Zero-Trust e Proteção de Credenciais
1. **Custódia Local Estrita:** Credenciais de API são persistidas apenas no `localStorage` do navegador do usuário.
2. **Criptografia Opcional com Desbloqueio Global:** Ao habilitar Master Password, as chaves são cifradas com PBKDF2 (100.000 iterações) e AES-GCM 256-bit. A tela `GlobalUnlockScreen` bloqueia todo o acesso sem a senha correta.
3. **Backup Criptografado:** Exportação e importação em arquivo `.cpmbackup` protegido por senha mestra.
4. **Proxy Inerte:** O relé `/api/proxy` recebe cabeçalhos criptografados e parâmetros já assinados na ponta do cliente, repassando-os sem registrar logs nem armazenar chaves.
5. **Fail-Fast de Autenticação:** Detecção algorítmica de erros 401/403 e códigos de rejeição das exchanges (Bybit `10003/10004/10005/33004`, OKX `50100/50105/50111/50113`, Bitget `40001/40005/40006/40014`). Ao identificar falha de credenciais, o sistema cancela imediatamente retries automáticos para proteger o IP do usuário contra banimentos de rate limit.
6. **Backoff com Jitter e Circuit Breaker:** Erros de rede e respostas 5xx utilizam backoff exponencial com jitter (5s a 60s) e pausa automática após 5 tentativas consecutivas.

### 6.2. Precisão Numérica e Normalização de Derivativos
1. **Aritmética com Big.js:** Todos os cálculos de taxas acumuladas, ratios de hedge, montantes de balanço e PnL por símbolo usam a biblioteca Big.js, banindo erros de arredondamento de floats JavaScript.
2. **Normalização de Contratos Inversos vs Lineares (`inverseUtils.ts`):**
   - *Bybit Inversa:* O campo `size` representa o montante em USD; a quantidade em cripto base é calculada via `cumEntryValue / entryPrice`.
   - *Bybit Linear:* O campo `size` representa a quantidade em cripto; o notional em USD é `cumEntryValue`.
   - *Bitget Inversa:* Multiplica o número bruto de contratos pelo valor contratual (`getBitgetInverseContractVal`) para encontrar o tamanho real em moeda.
   - *OKX:* Escalonamento pelo multiplicador de contrato (`ctVal`).
3. **Precificação Dinâmica de Tokens:** Para ativos mantidos na carteira de funding ou pares alternativos da Bitget, o sistema consulta `/api/v2/spot/market/tickers` e aciona fallback proxy (`fetchTokenUsdPrice`) para evitar avaliações distorcidas de patrimônio.

### 6.3. Sincronização SWR e Caching em IndexedDB
1. **Carregamento Instantâneo:** As visões analíticas renderizam imediatamente os dados persistidos no IndexedDB (`crypto-dashboard-cache`), disparando fetches incrementais em segundo plano.
2. **Coordenação Global (`lastSyncTime`):** A navegação entre abas de histórico reaproveita o snapshot cacheado caso uma sincronização recente já tenha ocorrido.
3. **Retenção e Expurgo sob Demanda:** Janelas configuráveis (30d a 2 anos) e botão "Prune History" para limpar registros antigos de posições encerradas e transações sem zerar o cache ativo.
4. **Auto-Reset de Scroll (`useLayoutEffect`):** A troca de aba na sidebar reseta a rolagem imediatamente para o topo da visualização.

### 6.4. Auditoria Contábil de Transações (10 Categorias Universais)
Extratos contínuos de Bybit, Bitget e OKX são normalizados em 10 tipos canônicos:
*Trade & Orders*, *Funding Fee*, *Transfer In / Deposit*, *Transfer Out / Withdraw*, *Liquidation & ADL*, *Interest & Loans*, *Rewards & Bonus*, *Delivery & Settle*, *Others*, *All Types*. Modais de detalhes fornecem o **Total Stats Summary** com volume total, taxas e variação líquida do lote.

### 6.5. Assistente Quantitativo PIKA
1. **Desabilitado por Padrão:** Requer ativação explícita em **AI Settings**.
2. **Zero-Trust de Chaves:** O motor de IA nunca tem acesso a credenciais de API.
3. **9 Ferramentas de Leitura:** Saldos consolidados, posições abertas, ordens, funding rates, métricas de hedge, market analytics, extratos contábeis, saúde das conexões e PnL por símbolo.
4. **Mascaramento no Modo Privacidade:** Converte valores nominais em proporções percentuais quando o Modo Privacidade estiver ativo.
5. **Multi-Provedor com Fallback:** Suporte a Ollama local (`localhost:11434`), Google Gemini Cloud (`@google/genai`) e OpenRouter, com comutação automática para modelo secundário em caso de falha.
6. **Auditoria e Telemetria:** Registro de cada interação com payload bruto, latência e consumo de tokens, com exportação em JSON e CSV.

---

## 7. Requisitos Funcionais (Matriz Completa)

| ID | Requisito Funcional | Módulo |
|---|---|---|
| **FR-1** | Exibir saldos consolidados multi-exchange com tags `UNIFIED` / `FUNDING` e ordenação flexível | Dashboard |
| **FR-2** | Monitorar posições ativas com mark price em tempo real, ROE%, alavancagem, margem e views Detailed/Lite | Open Positions |
| **FR-3** | Registrar histórico de posições fechadas com métricas analíticas (Win Rate, Profit Factor) e exportação | Closed Positions |
| **FR-4** | Exibir ordens abertas e histórico de ordens com filtros multicritério e busca regex | Order Reports |
| **FR-5** | Auditar execuções de ordens (trades) com identificação Maker/Taker e taxa cobrada | Trade History |
| **FR-6** | Calcular e exibir distribuição de PnL fechado por ativo (Long vs Short) | PnL by Symbol |
| **FR-7** | Auditar transaction log da Bybit UTA (até 2 anos) com conciliação contábil e Total Stats Summary | Bybit Transactions |
| **FR-8** | Auditar extrato transacional da Bitget (Classic e UTA) com Total Stats Summary | Bitget Transactions |
| **FR-9** | Auditar extrato contábil da OKX (recente e arquivo de 3 meses) com Total Stats Summary | OKX Transactions |
| **FR-10** | Mapeamento universal de transações em 10 categorias padronizadas | Universal Tx Mapper |
| **FR-11** | Painel Hedge Pro com modelo Beyond-100%, barra de exposição e resumo por moeda | Hedge Pro |
| **FR-12** | Market Analytics com Open Interest, Regimes de Mercado, Arbitragem de Funding, CVD e Inverse Dashboard | Market Analytics |
| **FR-13** | Dashboard de taxas de financiamento multi-período com agregação no serviço e auto-sync inteligente | Funding Fees |
| **FR-14** | Exportação de relatórios gerenciais em PDF, Excel (.xlsx) e CSV | Reports |
| **FR-15** | Gerenciador de chaves de API com validação imediata, status em tempo real e encriptação local | API Keys |
| **FR-16** | Terminal de logs de rede em tempo real com máscara de dados sensíveis e filtros | Connection Logs |
| **FR-17** | Testador de conectividade REST e WebSockets isolados | API Tester |
| **FR-18** | Ticker deslizante no topo do workspace espelhando posições em aberto (Positions Ticker) | Positions Ticker |
| **FR-19** | Assistente PIKA com 9 ferramentas de leitura, multi-provedor (Ollama/Gemini), telemetria e auditoria | PIKA Assistant |
| **FR-20** | Roteamento multi-regional da Bybit (NL, TR, HK, KZ, GE) e injeção de cabeçalhos oficiais para Brasil e Argentina | Bybit Endpoints |
| **FR-21** | Suporte a adaptadores Bitget Classic vs UTA, subcontas e inclusão da carteira de funding | Bitget Adapters |
| **FR-22** | Modo Simulação (Mock Data) com interrupção programática de chamadas reais e badge visual | Simulation Mode |
| **FR-23** | Modo Privacidade com mascaramento instantâneo de valores e ofuscação automática nas ferramentas de IA | Privacy Mode |
| **FR-24** | Governança de disco no IndexedDB com leitura de quota e expurgo seletivo sob demanda ("Prune History") | Storage Governance |
| **FR-25** | PWA instalável com Service Worker, cache offline e notificação de atualizações | PWA Integration |
| **FR-26** | Resiliência global com Fail-Fast de autenticação, circuit breaker e Global Error Boundary com Safe Recovery | System Resilience |
| **FR-27** | Consolidated Net Change Dashboard com 4 macro KPI cards, agrupamento por exchange/moeda e exportação CSV/Excel/PDF | Consolidated Transactions |
| **FR-28** | Portfolio Performance Dashboard com curvas de saldo/resultado, análise temporal (mês/dia), marcos de preço, resultados primários e métricas avançadas (Profit Factor, Win Rate, Consistency Index) | Portfolio Performance |
| **FR-29** | Tela e fluxo de migração mandatória de vault para credenciais legadas em texto plano | Security & Vault |
| **FR-30** | Otimização de renderização com downsampling a 80 pontos, animations desativadas e seletores atômicos no Zustand | Performance Optimization |

---

## 8. Requisitos Não-Funcionais

- **Segurança:** Postura Zero-Trust; chaves nunca saem do navegador; Web Crypto nativo; proxy inerte com allowlist anti-SSRF.
- **Confiabilidade:** Suíte abrangente de testes unitários e de integração verdes; tolerância a clock skew das exchanges.
- **Performance:** Latência zero no carregamento inicial de telas analíticas via IndexedDB; período padrão inicial de 7 dias, downsampling de séries e memoização rigorosa para prevenir renderizações desnecessárias.
- **Precisão Matemática:** Uso universal de Big.js para aritmética de funding, hedge e saldos.
- **Compatibilidade:** Suporte nativo a navegadores Desktop e Mobile (PWA); compatibilidade com ambientes serverless (Vercel) e instâncias Node.js (engines `>=24`).

---

*Crypto Portfolio Manager — Product Requirements Document (PRD v2.16.0).*
