# 📘 Manual do Usuário - Crypto Portfolio Manager (CPM)

> **Versão da Aplicação:** 2.13.0  
> **Plataformas Suportadas:** Bybit (API V5 UTA), Bitget (API V2 Classic & UTA), OKX (API V5)  
> **Arquitetura de Segurança:** Zero-Trust Client-Side (Criptografia Web Crypto PBKDF2 + AES-GCM 256-bit)

Bem-vindo ao **Crypto Portfolio Manager (CPM)**! Este terminal profissional foi desenvolvido para consolidar, monitorar e auditar em tempo real seu patrimônio, desempenho operacional, saldos em carteira, posições abertas e históricas, estratégias de hedge delta-neutral, taxas de financiamento (funding rates) e histórico contábil de transações entre as principais corretoras de derivativos de criptomoedas: **Bitget**, **Bybit** e **OKX**.

Nossa prioridade absoluta é a **segurança de nível zero-trust** e a **preservação integral da sua privacidade**: suas chaves de API, senhas e históricos operacionais permanecem estritamente sob sua custódia local no navegador, nunca trafegando ou sendo armazenados em bancos de dados de terceiros.

---

## 📌 Sumário

1. [Arquitetura de Segurança Zero-Trust](#1-arquitetura-de-segurança-zero-trust)
2. [Configuração Inicial e Chaves de API](#2-configuração-inicial-e-chaves-de-api)
   - [Configurações Regionais e Origem Bybit](#configurações-regionais-e-origem-bybit)
   - [Bitget: Seleção Classic vs UTA, Subcontas e Funding](#bitget-seleção-classic-vs-uta-subcontas-e-funding)
   - [OKX: Dual-Wallet (Trading e Funding)](#okx-dual-wallet-trading-e-funding)
3. [Senha Mestra Global e Backups Criptografados](#3-senha-mestra-global-e-backups-criptografados)
4. [Modo Simulação (Mock Data)](#4-modo-simulação-mock-data)
5. [Terminal de Logs Integrado (Connection Logs)](#5-terminal-de-logs-integrado-connection-logs)
6. [Sincronização, Retenção e Configurações de Cache (Settings)](#6-sincronização-retenção-e-configurações-de-cache-settings)
7. [Guia de Telas e Navegação Diária](#7-guia-de-telas-e-navegação-diária)
   - [🏠 Dashboard Principal](#-dashboard-principal)
   - [⚡ Positions Ticker (Marquee em Tempo Real)](#-positions-ticker-marquee-em-tempo-real)
   - [🛡️ Hedge Pro Dashboard (Gestão Delta-Neutral e Contratos Inversos)](#-hedge-pro-dashboard-gestão-delta-neutral-e-contratos-inversos)
   - [💼 Open Positions (Posições Ativas — Detailed & Lite)](#-open-positions-posições-ativas--detailed--lite)
   - [📂 Closed Positions (Histórico de Posições e Analytics)](#-closed-positions-histórico-de-posições-e-analytics)
   - [📝 Order Reports (Ordens Abertas e Histórico de Ordens)](#-order-reports-ordens-abertas-e-histórico-de-ordens)
   - [🔄 Trade History (Histórico de Execuções)](#-trade-history-histórico-de-execuções)
   - [📜 Histórico de Transações Multi-Corretora (Bybit, Bitget e OKX Transactions)](#-histórico-de-transações-multi-corretora-bybit-bitget-e-okx-transactions)
   - [📈 Market Analytics (Inteligência Quantitativa e Derivativos)](#-market-analytics-inteligência-quantitativa-e-derivativos)
   - [📊 PnL by Symbol (Lucros e Perdas por Símbolo)](#-pnl-by-symbol-lucros-e-perdas-por-símbolo)
   - [💸 Dashboard de Taxas de Financiamento (Funding Fees)](#-dashboard-de-taxas-de-financiamento-funding-fees)
   - [📑 Reports (Exportação de Relatórios Gerenciais)](#-reports-exportação-de-relatórios-gerenciais)
   - [⚡ API Tester (Testador de Conexões e Endpoints)](#-api-tester-testador-de-conexões-e-endpoints)
   - [👁️ Modo Privacidade (Privacy Mode)](#-modo-privacidade-privacy-mode)
8. [PIKA Assistant (Portfolio Information & Knowledge Assistant)](#8-pika-assistant-portfolio-information--knowledge-assistant)
   - [Princípios de Segurança e Privacidade](#-princípios-de-segurança-e-privacidade)
   - [Provedores Suportados e Modelos Locais/Nuvem](#-provedores-suportados-e-modelos-locaisnuvem)
   - [Catálogo de Ferramentas Analíticas (Tool Calling)](#-catálogo-de-ferramentas-analíticas-tool-calling)
   - [Auditoria de Compatibilidade de Ferramentas](#-auditoria-de-compatibilidade-de-ferramentas)
   - [Telemetria Avançada, Gráfico Diário e Exportação de Logs](#-telemetria-avançada-gráfico-diário-e-exportação-de-logs)
   - [Atalho Global e Chat Drawer](#-atalho-global-e-chat-drawer)
9. [Padronização de Contratos Inversos e Precisão Numérica](#9-padronização-de-contratos-inversos-e-precisão-numérica)
10. [Precificação Dinâmica de Tokens e Fallback de Tickers](#10-precificação-dinâmica-de-tokens-e-fallback-de-tickers)
11. [Resiliência de Conexão, Fail-Fast e Global Error Boundary](#11-resiliência-de-conexão-fail-fast-e-global-error-boundary)
12. [Suporte a PWA (Instalar App no Desktop e Mobile)](#12-suporte-a-pwa-instalar-app-no-desktop-e-mobile)
13. [Solução de Problemas Comuns (FAQ)](#13-solução-de-problemas-comuns-faq)

---

## 1. Arquitetura de Segurança Zero-Trust

O CPM foi projetado sob um paradigma rígido de segurança descentralizada:
- **Sem Banco de Dados Externo para Credenciais**: Não operamos nenhum servidor na nuvem que armazene suas chaves de API ou histórico patrimonial. Toda a comunicação ocorre diretamente do seu navegador para os servidores oficiais das corretoras.
- **Armazenamento Seguro no Cliente (`localStorage`)**: Suas credenciais são guardadas estritamente no armazenamento local do navegador, podendo ser adicionalmente cifradas por senha mestra com algoritmos industriais (**PBKDF2 com 100.000 iterações e AES-GCM 256-bit**).
- **Proxy Inerte Local / Serverless (`server.ts` / `/api/proxy`)**: Para superar restrições de CORS impostas por navegadores web, o CPM utiliza um proxy local de alto desempenho. O cliente gera todas as assinaturas criptográficas (HMAC-SHA256, timestamps nano/ISO) na ponta antes do envio. O proxy apenas repassa o payload aos endpoints oficiais sem adulterar assinaturas, sem reter dados e sem conhecer suas chaves secretas.
- **NUNCA use Chaves com Permissões de Saque ou Negociação**: O monitoramento exige **estritamente permissões de LEITURA (Read-Only)**. Nunca crie nem utilize chaves com permissões para enviar fundos, transferir ativos ou executar novas ordens.

---

## 2. Configuração Inicial e Chaves de API

Para conectar suas contas reais ao terminal CPM:

1. **Gere Chaves de Leitura nas Corretoras:**
   - **Bybit**: API V5 (Read-only, permissões para Account, Position e Trade).
   - **OKX**: API V5 (Read-only, insira uma **Passphrase** segura que você configurou na criação da chave).
   - **Bitget**: API V2 (Read-only, exige **Passphrase**; o sistema oferece suporte automático para contas Classic e UTA).
2. **Abra o Gerenciador de Chaves**: No menu lateral, acesse **API Keys** e clique em **+ Add Exchange**.
3. **Preencha os Campos do Modal:**
   - **Exchange**: Selecione Bitget, Bybit ou OKX.
   - **Label**: Um nome amigável para identificar a conta (ex: *Bybit UTA Principal*, *Bitget Arbitragem*). Mínimo de 3 caracteres, nomes duplicados por exchange são prevenidos automaticamente.
   - **API Key** e **API Secret**.
   - **Passphrase**: Obrigatório para Bitget e OKX.

### Configurações Regionais e Origem Bybit
Para usuários da Bybit, o modal oferece seletores avançados de ambiente e conformidade regulatória:
- **Environment**: Alternância transparente entre **Mainnet** (Ambiente Real de Produção) e **Testnet** (Rede de Testes Simulada).
- **Account Region / Origin**: Roteamento direto para o domínio regulatório correspondente:
  - *Global Default* (`api.bybit.com`)
  - *Netherlands* (`api.bybit.nl`)
  - *Turkey* (`api.bybit-tr.com`)
  - *Hong Kong* (`api.bybit.com.hk`)
  - *Kazakhstan* (`api.bybit.kz`)
  - *Georgia* (`api.bybit.com.ge`)
  - *Brazil International* (`api.bybit.com` com injeção automática do cabeçalho oficial `x-site-id: 10001`)
  - *Argentina International* (`api.bybit.com` com injeção automática do cabeçalho oficial `x-site-id: 10002`)

### Bitget: Seleção Classic vs UTA, Subcontas e Funding
- **Account Type**:
  - **Classic**: Para contas que operam no modelo tradicional de carteiras separadas (Spot e Mix/Futures).
  - **UTA (Unified Trading Account)**: Para contas modernizadas de margem unificada da Bitget.
- **Include Funding Account**: Quando marcado, o sistema busca e agrega também os ativos mantidos na carteira de financiamento/spot da conta.
- **Sub-account**: Quando ativado, marca visualmente a conexão como uma subconta subordinada a uma conta mestre, facilitando filtros segregados em transações e balanços.

### OKX: Dual-Wallet (Trading e Funding)
O `OkxAdapter` executa chamadas concorrentes para a conta de negociação (`/api/v5/account/balance`) e para a carteira de financiamento (`/api/v5/asset/balances`). Os ativos são precificados em tempo real e identificados pelas tags visuais `UNIFIED` (negociação) e `FUNDING` (depósitos/financiamento passivo).

---

## 3. Senha Mestra Global, Cofre Zero-Trust e Auto-Lock por Inatividade

Para proteger suas informações caso utilize um computador compartilhado ou dispositivo pessoal de uso misto, o CPM integra uma suíte completa de governança e segurança para suas credenciais:

1. **Inicialização do Cofre no Primeiro Cadastro**:
   - Ao adicionar sua primeira chave de API no modal (**+ Add Exchange**), o CPM detecta automaticamente se o cofre local ainda não foi inicializado e solicita a criação de uma **Senha Mestra (Master Passphrase)** com no mínimo 8 caracteres.
   - Todas as credenciais de API são criptografadas no navegador antes de serem persistidas, utilizando derivação de chave **PBKDF2-SHA256 (600.000 iterações)** e cifra simétrica autenticada **AES-GCM 256-bit**.
2. **Bloqueio Global de Sessão (Global Unlock Screen)**:
   - Ao recarregar a página, fechar a aba ou reabrir o aplicativo, uma tela de bloqueio impede qualquer renderização de dados sensíveis até a digitação correta da senha mestra.
   - Em caso de esquecimento, a tela oferece opção de reset de fábrica (*Wipe Data*) para purgar as credenciais locais e recomeçar de forma segura.
3. **Auto-Lock por Inatividade (Inactivity Auto-Lock)**:
   - No card **Security Settings** (em **Settings**), você pode ativar o **Auto-Lock on Inactivity**.
   - **Slider de Intervalo**: Configure livremente o tempo de tolerância para ociosidade entre **1 e 60 minutos** (padrão de 15 minutos).
   - O hook `useVaultAutoLock` monitora eventos de interação (movimentos do mouse, digitação, toques e rolagem). Caso o usuário se ausente pelo tempo definido, o CPM bloqueia o cofre automaticamente e **purga instantaneamente todas as credenciais em texto puro da memória RAM**.
4. **Bloqueio Sob Demanda (Lock Vault Now)**:
   - No painel de segurança, clique no botão **Lock Vault Now** para travar imediatamente a aplicação e descartar chaves ativas da memória sem precisar recarregar o navegador.
5. **Alteração e Re-criptografia de Senha Mestra**:
   - Deseja trocar sua senha? Acesse **Security Settings** $\to$ **Change Passphrase**. Informe a senha atual e a nova senha mestra (mínimo 8 caracteres). O CPM re-criptografa todas as suas chaves cadastradas em lote, preservando suas contas intactas.
6. **Aviso Temporário de Inicialização (Vault Setup Notice Modal)**:
   - Caso você utilize o aplicativo sem configurar uma senha mestra, um aviso sutil de 5 segundos é exibido na inicialização alertando sobre os benefícios de segurança do cofre e oferecendo um botão direto para configuração. Esse aviso pode ser desativado a qualquer momento nas configurações.
7. **Exportação de Backups Criptografados (`.cpmbackup`)**:
   - Clique em **Export Backup File** para gerar um arquivo seguro contendo todas as conexões, preferências e configurações.
   - O arquivo pode ser transferido com total segurança por pen drive, nuvem ou armazenado em cofre offline.
8. **Restauração de Backup**:
   - Clique em **Import Backup**, selecione seu arquivo `.cpmbackup` e forneça a senha mestra correspondente para restaurar instantaneamente o ambiente.

---

## 4. Modo Simulação (Mock Data)

Para explorar a plataforma sem conectar contas reais ou demonstrar recursos em lives e vídeos:

1. Acesse **Settings** no menu lateral.
2. Ative a chave **Use Mock Data (Simulation Mode)**.
3. **Comportamento do Modo Simulação**:
   - As conexões reais REST e WebSockets são pausadas imediatamente.
   - Carrega instantaneamente dados calibrados multi-exchange (saldos, posições abertas e históricas, ordens, extratos contábeis e métricas de hedge).
   - Exibe um badge pulsante amarelo no topo (**Simulation Mode**).
   - Desativa botões de sincronização forçada manual para evitar requisições desnecessárias a servidores externos.
   - Ao desativar, a sincronização ao vivo é restabelecida imediatamente.

---

## 5. Terminal de Logs Integrado (Connection Logs)

Para auditoria técnica e diagnóstico de latência e conectividade:

1. **Acesso Direto**: Clique em **Logs** no menu lateral para abrir o `ConnectionLogTerminal`.
2. **Máscara Automática de Segredos (Zero-Leak)**: Todas as requisições passam por um sanitizador de expressões regulares que oculta senhas, API keys, secrets, passphrases e assinaturas HMAC.
3. **Categorias de Log**:
   - `SYSTEM`: Inicialização de subsistemas, montagem de adaptadores e timers.
   - `DATA`: Chegada de deltas de saldos, tickers e atualizações de ordens.
   - `WARN`: Lentidão de rede, timeouts ou alertas de margem.
   - `ERROR`: Falhas de autenticação, erros de rede e respostas HTTP anômalas.
4. **Filtros e Busca por Texto/Regex**: Localize instantaneamente eventos de ativos específicos (ex: `BTCUSDT`, `ETH-PERP`) ou códigos de erro.

---

## 6. Sincronização, Retenção e Configurações de Cache (Settings)

O CPM implementa o padrão **SWR (Stale-While-Revalidate)** e armazenamento local em **IndexedDB** (`crypto-dashboard-cache` com 14 stores estruturadas):

- **Latência Zero**: Gráficos e tabelas são exibidos imediatamente com base no cache local persistido, enquanto requisições de fundo buscam apenas deltas incrementais.
- **Coordenação Global de Sync (`lastSyncTime`)**: Alternar entre abas de histórico (Ordens, Posições, Trade History, PnL by Symbol) não dispara requisições concorrentes redundantes se uma sincronização recente já tiver ocorrido.
- **Governança de Quota do Navegador (`storageQuota`)**:
  - Medição em tempo real de espaço consumido e limite total via `navigator.storage.estimate()`.
  - Barra de progresso visual com codificação de cores preventiva contra disco cheio.
- **Data Retention & History Pruning**:
  - Janelas de retenção configuráveis: *30 dias*, *60 dias*, *90 dias*, *180 dias*, *365 dias (Padrão)* ou *730 dias (2 anos)*.
  - Botão **"Prune History"**: Remove registros antigos das stores de extrato e posições encerradas anteriores à janela de corte, preservando metadados de contas e liberando espaço sem reiniciar o cache.
- **Limpeza Seletiva de Cache**:
  - *Clear Orders Cache*, *Clear Funding Cache*, *Clear Transactions Cache*.
  - **Danger Zone — Wipe All Local Client Data**: Redefine o CPM para o estado de fábrica, apagando chaves, preferências e bases locais.

---

## 7. Guia de Telas e Navegação Diária

### 🏠 Dashboard Principal
O centro de controle financeiro do seu portfólio:
- **Total Equity (Patrimônio Consolidado)**: Soma em tempo real do patrimônio líquido em USD de todas as carteiras e subcontas conectadas.
- **Unrealized PnL (Lucro Não Realizado)**: PnL flutuante diário somado de todas as posições ativas.
- **Margin Usage & Available Margin**: Proporção de margem comprometida vs margem livre para suportar flutuações de mercado.
- **Alocação por Corretora & Gráfico de Custódia**: Gráfico de distribuição patrimonial entre Bybit, Bitget e OKX.
- **Tabela Hierárquica de Contas e Moedas (`ExchangeHierarchyTable`)**: Estrutura expansível por Corretora $\to$ Subconta $\to$ Criptoativo, com saldos detalhados, valor em USD, tags `UNIFIED` / `FUNDING` e sparklines de performance.

### ⚡ Positions Ticker (Marquee em Tempo Real)
Barra deslizante contínua fixada no topo de todas as telas que espelha as posições abertas com símbolo, direção (Long/Short), tamanho, preço atual e PnL não realizado dinâmico.

### 🛡️ Hedge Pro Dashboard (Gestão Delta-Neutral e Contratos Inversos)
Promovido a um **módulo de navegação de primeiro nível** no menu lateral, projetado especialmente para arbitragem de funding e estratégias delta-neutral em contratos COIN-M (Inversos):
- **Modelo Matemático Beyond-100%**:
  - **Proteção Real (Locked USD Entry)**: Posições Short em contratos inversos travam o valor em USD no preço de entrada (`entryPrice`), garantindo proteção do capital contra desvalorização do ativo subjacente (limitado pelo saldo da moeda).
  - **Exposição Direcional e Alavancagem**: Posições Long em contratos inversos adicionam risco direcional e multiplicam a oscilação do patrimônio.
- **Barra de Exposição do Portfólio (Portfolio Exposure Bar)**: Exibe visualmente a fatia de Capital Protegido (verde), Capital Exposto (amarelo) e Alavancagem além de 100% (vermelho/laranja).
- **Tabela Resumo por Moeda (`HedgeProCoinRows`)**: Mostra saldo em moeda, cotação atual, valor em USD, montante protegido, montante exposto, contagem de posições e tags de alerta para moedas sobre-expostas (*Overexposed*).
- **Gráficos Decompostos**: `HedgeProBreakdownChart` e `HedgeProCapitalExposureChart` para análise visual rápida da carteira.
- **Gaveta de Métricas por Moeda (`HedgeProCoinDrawerMetrics`)**: Permite expandir qualquer criptomoeda para inspecionar posições individuais, margens e taxas aplicadas.

### 💼 Open Positions (Posições Ativas — Detailed & Lite)
- **Modos de Exibição**: Alterne entre a visão **Detailed** (com cartões informativos completos) e a visão **Lite** (tabela densa compacta para alta frequência).
- **Métricas Chave**: Preço de entrada, Mark Price atualizado via polling rápido, ROE%, PnL flutuante, modo de margem (Cross/Isolated), alavancagem efetiva e Preço de Liquidação com alertas visuais de proximidade.
- **Logotipos Inteligentes (`CoinIcon`)**: Resolução automática com fallbacks em cascata para garantir que qualquer par possua representação visual nítida.

### 📂 Closed Positions (Histórico de Posições e Analytics)
- **Livro Contábil Completo**: Posições encerradas nas três corretoras com dados de entrada, saída, PnL fechado líquido e taxas pagas.
- **Quadro Estatístico de Performance**: **Win Rate %**, **Profit Factor**, Razão Ganho/Perda, Média de Lucro por Trade Vencedor e Maior Operação Histórica.
- **Filtros Temporais e Busca**: Janelas rápidas (7D, 30D, 90D, customizado) e busca instantânea por ativo.
- **Exportação Multiformato**: Gere arquivos em **CSV**, **Excel (.xlsx)** ou relatórios em **PDF** formatados para auditoria fiscal.

### 📝 Order Reports (Ordens Abertas e Histórico de Ordens)
- **Open Orders**: Monitore ordens Limit, Market, Stop Loss e Take Profit ativas em qualquer exchange com indicação de gatilhos e preenchimentos parciais.
- **Order History**: Histórico consolidado de ordens executadas, expiradas ou canceladas com suporte a busca avançada por expressão regular.

### 🔄 Trade History (Histórico de Execuções)
- Acompanhe cada execução de ordem preenchida (fills) com registro do preço executado, tamanho na moeda base, papel na liquidez (Maker vs Taker) e moeda exata utilizada para cobrança de taxas.

### 📜 Histórico de Transações Multi-Corretora (Bybit, Bitget e OKX Transactions)
Módulos avançados de auditoria contábil e conciliação de fluxo de caixa:
- **Navegação Dinâmica**: A seção de transações no menu lateral se adapta automaticamente, exibindo apenas as abas correspondentes às corretoras com contas ativas ou modo simulação.
- **Sincronização Profunda Progressiva**: Backfill estruturado em blocos de 7 dias com checkpoints no IndexedDB para cobertura de longos períodos (Bybit UTA até 2 anos; OKX recente + arquivo de 3 meses; Bitget Classic e UTA).
- **Mapeador Universal (Universal Transaction Mapper — 10 Categorias)**:
  1. *Trade & Orders* (Trades e PnL de fechamento)
  2. *Funding Fee* (Taxas e proventos periódicos de funding)
  3. *Transfer In / Deposit* (Depósitos e transferências recebidas)
  4. *Transfer Out / Withdraw* (Saques e transferências enviadas)
  5. *Liquidation & ADL* (Liquidações compulsórias e desalavancagens)
  6. *Interest & Loans* (Juros de margem e empréstimos)
  7. *Rewards & Bonus* (Vouchers, fundos de teste e airdrops)
  8. *Delivery & Settle* (Liquidações de contratos a termo e opções)
  9. *Others* (Conversões cambiais e ajustes contábeis)
  10. *All Types* (Visão integral)
- **Modal de Detalhes com Sumário de Totais (Total Stats Summary)**: Ao abrir o modal de detalhes de uma transação, um cabeçalho resumido exibe o volume financeiro total, taxas líquidas e variação patrimonial associada.
- **Cálculo Real de Fluxo de Caixa**: Fórmulas rigorosas de conciliação: `Variação = Cashflow + Funding - Fees`.

### 📈 Market Analytics (Inteligência Quantitativa e Derivativos)
Terminal analítico cross-exchange que consolida dados de derivativos em tempo real:
- **Modo Multi-Market Overview**:
  - *Seletor de Ativos com Favoritos*: Salva pares frequentes (ex: BTC, ETH, SOL) no armazenamento local.
  - *Tipos de Mercado*: PERP (Lineares USDT/USDC), INVERSE (Contratos na Moeda), SPOT e ALL.
  - *Auto-Refresh com Contador Circular*: Intervalos selecionáveis (5s, 10s, 15s, 30s, 60s ou Pausado) com indicador visual de contagem regressiva e recarga imediata.
  - *Open Interest (OI) & Monitor de Alavancagem*: Gráfico de eixo duplo relacionando preço e volume em aberto em USD.
  - *Detector Algorítmico de Regime de Mercado*:
    - `Long Accumulation`: Preço ↑ e OI ↑ (Entrada agressiva de compradores).
    - `Short Squeeze`: Preço ↑ e OI ↓ (Alta impulsionada por liquidação forçada de vendidos).
    - `Aggressive Shorting`: Preço ↓ e OI ↑ (Entrada agressiva de novas posições vendidas).
    - `Long Liquidation`: Preço ↓ e OI ↓ (Desova em cascata de posições compradas).
    - `Neutral Consolidation`: Preço e OI lateralizados sem convicção direcional.
  - *Cross-Exchange Funding Arbitrage*: Scanner de discrepâncias de taxas entre Bybit, OKX e Bitget, calculando spread de 8h e APR anualizado (`Spread APR = Spread 8h * 3 * 365`), indicando a melhor exchange para Long e Short.
  - *Order Flow & Cumulative Volume Delta (CVD)*: Rastreamento de agressões (`Net Delta = Taker Buy - Taker Sell`) com detecção de divergências altistas (*Bullish*) e baixistas (*Bearish*).
  - *Sentimento Smart Money vs Retail*: Compara o ratio Long/Short do varejo contra os 20% maiores operadores em volume nocional, com índice Fear & Greed e alertas institucionais.
- **Modo Inverse Coin-M Dashboard**:
  - Sub-painel 100% dedicado a contratos COIN-M com desdobramento expansível por corretora (Funding 8h, Volume 24h, Open Interest e Spread), além de botões para expandir e recolher todos os pares em bloco.

### 📊 PnL by Symbol (Lucros e Perdas por Símbolo)
- Relatório de desempenho isolado por criptoativo operado, com separação de ganhos e perdas em operações Long vs Short, fator de lucro por moeda e barras visuais de intensidade financeira.

### 💸 Dashboard de Taxas de Financiamento (Funding Fees)
- **Pipeline de Agregação no Serviço**: Cálculos de alta precisão com biblioteca Big.js armazenados em formato condensado (`FundingRateSummary`) no IndexedDB.
- **Análise Multi-Período**: Próxima Taxa, Última Taxa, Hoje, Mês Atual, Mês Anterior, 3 Meses, 6 Meses e 1 Ano (com exclusão inteligente do mês corrente nas janelas multi-mês para integridade contábil).
- **Gráfico Comparativo Horizontal**: Ordenação interativa por taxa com filtros rápidos de Favoritos, Posições Abertas e Contratos Inversos (COIN-M).
- **Auto-Sync Inteligente**: Agendamento automático calculado para `próximo acerto de funding + 60s`.

### 📑 Reports (Exportação de Relatórios Gerenciais)
- Central de exportação de dados auditáveis em formato PDF (com diagramação limpa de tabelas), Excel e CSV, prontos para comprovação contábil e declarações de rendimentos.

### ⚡ API Tester (Testador de Conexões e Endpoints)
- Ambiente de diagnóstico técnico isolado: efetue chamadas REST diretas para testar rotas públicas e privadas, verifique handshakes de WebSockets em tempo real e meça a latência exata da rede.

### 👁️ Modo Privacidade (Privacy Mode)
- Clique no botão de **Olho** no cabeçalho superior para ocultar imediatamente todos os saldos monetários, valores nocionais e PnL da interface com máscaras de segurança (`$••••`), permitindo compartilhamento de tela ou streaming público seguro.

---

## 8. PIKA Assistant (Portfolio Information & Knowledge Assistant)

O **PIKA** é o assistente quantitativo e auditor de inteligência artificial nativo do Crypto Portfolio Manager. Ele transforma dados complexos de múltiplos derivativos e saldos dispersos em relatórios objetivos e respostas estratégicas em linguagem natural.

### 🔒 Princípios de Segurança e Privacidade
1. **Desabilitado por Padrão**: Permanece completamente inativo até ser expressamente habilitado em **AI Settings**.
2. **Zero-Trust de Credenciais**: O motor de IA **jamais tem acesso a chaves de API, API Secrets ou Passphrases**. As ferramentas alimentam a IA apenas com dados normalizados já consolidados pelo cliente.
3. **Estritamente Consultivo (Read-Only)**: O PIKA não possui nenhuma ferramenta capaz de abrir ordens, movimentar ativos ou alterar configurações de rede.
4. **Mascaramento no Modo Privacidade**: Se o Modo Privacidade estiver ligado no CPM, os valores informados às ferramentas do PIKA são automaticamente convertidos em porcentagens ou mascarados para garantir que números patrimoniais nominais nunca sejam transmitidos ao modelo de IA.
5. **Kill-Switch via Variável de Ambiente**: Suporte à flag `AI_CHAT_BOT_ENABLED` / `VITE_AI_CHAT_BOT_ENABLED` para remover integralmente o assistente em implantações institucionais que exigem ausência total de LLMs.

### ⚙️ Provedores Suportados e Modelos Locais/Nuvem
- **Ollama (100% Local e Privado)**:
  - Comunicação direta com sua instância local do Ollama (`http://localhost:11434` ou endpoint de rede customizado).
  - Descoberta automática de modelos instalados (`llama3.2`, `qwen2.5`, `mistral`, etc.).
  - Nenhum dado trafega para a nuvem.
- **Google Gemini Cloud**:
  - Integração moderna via SDK `@google/genai` utilizando modelos multimodais de alta performance (`gemini-2.5-flash`, `gemini-1.5-pro`).
  - Suporte a rotas proxy de backend seguras para gestão de chaves.
- **OpenRouter / OpenAI / Anthropic / Custom**:
  - Conexão flexível com qualquer provedor compatível com o protocolo OpenAPI utilizando chave própria salva exclusivamente no navegador.
- **Política de Fallback Automático**: Caso o modelo primário (ex: Ollama local) não responda ou sofra timeout, o PIKA recorre automaticamente ao modelo secundário configurado.

### 🛠️ Catálogo de Ferramentas Analíticas (Tool Calling)
O PIKA conta com 9 ferramentas de leitura registradas em tempo de execução:
1. `get_consolidated_balances`: Recupera saldos consolidados por moeda, corretora e categoria.
2. `get_open_positions`: Inspeciona posições ativas, preços de entrada, mark price, margem e liquidação.
3. `get_order_history`: Consulta histórico recente de ordens e execuções.
4. `get_funding_rates`: Retorna taxas atuais e projeções de financiamento para derivativos perpétuos.
5. `get_hedge_pro_metrics`: Fornece métricas de proteção de capital, saldo protegido e exposição em contratos inversos.
6. `get_market_analytics`: Fornece diagnósticos quantitativos de Open Interest, regime de mercado e CVD.
7. `get_transaction_summary`: Resume o extrato de transações contábeis, taxas e variações de caixa.
8. `get_exchange_connection_health`: Informa o status de sincronização, latência e saúde das conexões.
9. `get_pnl_by_symbol`: Fornece a matriz de lucro e perda agregada por símbolo.

### 🔍 Auditoria de Compatibilidade de Ferramentas
No modal de gerenciamento de modelos (**AI Settings** $\to$ **Manage Models**), o CPM audita ativamente se cada modelo suporta chamadas de função estruturadas (*Tool-Calling*), exibindo selos visuais de compatibilidade e orientando a escolha dos modelos mais capazes.

### 📊 Telemetria Avançada, Gráfico Diário e Exportação de Logs
- **Cards de Telemetria**: Acompanhamento de tempo de resposta médio, taxa de sucesso de requisições e contagem total de tokens.
- **Gráfico de Consumo Diário de Tokens**: Visualização cronológica do volume de tokens processados por dia.
- **Tabela de Auditoria com Visualizador JSON**: Exibe cada interação com registro do prompt, ferramentas acionadas, payload bruto de requisição e resposta do modelo.
- **Exportação de Logs**: Baixe o histórico de auditoria em arquivos estruturados **JSON** ou **CSV**.

### ⌨️ Atalho Global e Chat Drawer
- Pressione **`Ctrl + J`** (ou **`Cmd + J`** no macOS) de qualquer tela para abrir ou recolher instantaneamente a gaveta lateral do PIKA Assistant.
- O drawer conta com botões rápidos de sugestão (*Quick Action Chips*), formatação em Markdown com destaque sintático, tabelas financeiras estéticas e mini-gráficos Recharts renderizados diretamente na conversa.

---

## 9. Padronização de Contratos Inversos e Precisão Numérica

As corretoras de criptomoedas possuem convenções opostas para contratos lineares (USDT/USDC-M) e inversos (COIN-M):
- **Bybit Inversa**: O campo `size` representa o montante em dólares americanos (USD). O CPM calcula o tamanho em criptomoeda base dividindo o valor de entrada acumulado pelo preço de entrada (`cumEntryValue / entryPrice`).
- **Bybit Linear**: O campo `size` representa a quantidade em criptomoeda diretamente, e o valor em USD é derivado do valor nocional.
- **Bitget Inversa**: A quantidade bruta de contratos é multiplicada pelo valor contratual oficial (`getBitgetInverseContractVal`) para apurar o montante real em criptomoeda.
- **OKX**: O tamanho é escalonado dinamicamente com base no multiplicador de contrato (`ctVal`).
- **Precisão Financeira**: Todos os cálculos críticos de funding, hedge e saldos utilizam a biblioteca matemática **Big.js**, eliminando imprecisões e erros de arredondamento comuns de floats nativos em JavaScript.

---

## 10. Precificação Dinâmica de Tokens e Fallback de Tickers

Para garantir que ativos na carteira de financiamento (Spot/Funding) ou moedas alternativas da Bitget e OKX sejam representadas pelo valor financeiro exato:
- O CPM realiza consultas dinâmicas de tickers a mercado via endpoint público `/api/v2/spot/market/tickers`.
- Para tokens especiais que não possuem par direto USDT na corretora, o sistema aciona um mecanismo de recuperação secundária via proxy seguro (`fetchTokenUsdPrice`), garantindo avaliação patrimonial precisa e sem distorções no patrimônio consolidado.

---

## 11. Resiliência de Conexão, Proteção Anti-SSRF, Code-Splitting e Global Error Boundary

- **Proteção Avançada contra SSRF (`ssrfValidator.ts`)**:
  - Tanto o servidor local (`server.ts`) quanto a função serverless (`/api/proxy.ts`) implementam um motor robusto de validação de URLs upstream.
  - Bloqueio estrito de requisições direcionadas a serviços de metadados de nuvem (como `169.254.169.254`, `metadata.google.internal`), portas de rede reservadas ou perigosas e esquemas não permitidos.
  - Domínios de API de corretoras e de provedores de IA autorizados (OpenAI, OpenRouter) são checados contra allowlists estritas. Para instâncias locais do Ollama, redes LAN e localhost são permitidas com segurança (`allowLanIps: true`).
- **Code-Splitting e Carregamento Rápido (React Suspense & TabLoadingSkeleton)**:
  - Para garantir um carregamento inicial quase instantâneo do bundle da aplicação, todas as abas analíticas pesadas (`MarketAnalyticsDashboard`, `HedgeProDashboard`, `FundingDashboard`, `ClosedPositions`, transações, relatórios e configurações) utilizam `React.lazy`.
  - Durante a alternância entre abas, o componente `TabLoadingSkeleton` exibe esqueletos visuais elegantes, eliminando congelamentos na interface do usuário.
- **Fail-Fast em Falha de Autenticação**: Se uma chave for cadastrada com segredo incorreto, permissão insuficiente ou IP não autorizado (status HTTP 401/403, códigos de erro Bybit `10003/10004/10005/33004`, OKX `50100/50105/50111/50113`, Bitget `40001/40005/40006/40014`), o CPM interrompe imediatamente os retries automáticos. Isso impede que seu IP seja bloqueado pelas defesas anti-força-bruta da Cloudflare ou Akamai.
- **Backoff Exponencial com Jitter para Falhas de Rede**: Em instabilidades transitórias de conexão, o sistema re-tenta com intervalos progressivos (5s $\to$ 10s $\to$ 20s $\to$ 40s $\to$ 60s) adicionados de variação aleatória (jitter), limitado a 5 tentativas antes de acionar o circuit breaker.
- **Global Error Boundary**: Se ocorrer uma falha inesperada na árvore do React, a aplicação não quebra em tela branca. Uma tela de proteção graciosa (**Safe Recovery**) oferece diagnóstico do incidente e dois botões de restauração em um clique: **Reload Dashboard** e **Clear Cache & Reload**.
- **Reset Automático de Scroll**: Ao navegar entre abas no menu lateral, o leitor de layout do React reseta instantaneamente a rolagem para o topo da página, garantindo foco imediato nas informações principais.
- **Quality Gate no CI**: Pipeline automatizado no GitHub Actions executando checagem estrita de tipos TypeScript, compilação de produção e a suíte completa de **61 arquivos de teste com 631 testes unitários e de integração**.

---

## 12. Suporte a PWA (Instalar App no Desktop e Mobile)

O CPM é um Progressive Web App (PWA) de última geração:
- **Instalação Nativa**: No Chrome, Edge ou Safari, clique no ícone de instalação na barra de endereços para instalar o CPM como um aplicativo nativo na sua Área de Trabalho ou tela inicial móvel.
- **Cache Offline Inteligente**: Assets essenciais e bibliotecas de interface são mantidos em cache pelo Service Worker, proporcionando carregamento quase instantâneo.
- **Notificação de Atualizações (`UpdateNotification`)**: Quando uma nova versão do CPM é implantada, um card discreto avisa sobre a disponibilidade da atualização, permitindo atualizar o aplicativo com um único clique.

---

## 13. Solução de Problemas Comuns (FAQ)

### Minha chave de API não conecta ou exibe erro de autenticação. O que fazer?
1. Verifique se copiou a chave sem espaços acidentais no início ou no fim.
2. Certifique-se de que selecionou a corretora correta (chaves Bybit não funcionam na OKX).
3. Na **Bitget** e **OKX**, verifique se digitou a **Passphrase** exata definida na criação da chave.
4. Na **Bybit**, se você reside em jurisdições com domínios regulatórios (como Holanda ou Turquia) ou possui conta internacional de Brasil/Argentina, selecione a opção correspondente em **Account Region / Origin** para que os cabeçalhos apropriados sejam enviados.
5. Na **Bitget**, se sua conta foi migrada para o formato unificado, selecione o tipo de conta **UTA** no modal de chaves.

### Esqueci minha Senha Mestra. É possível recuperá-la por e-mail?
Não. Como o CPM adota uma arquitetura Zero-Trust, não existem servidores de terceiros ou bancos de dados remotos para recuperação de senha. Caso a esqueça, utilize o botão de redefinição de fábrica na tela de desbloqueio para apagar as chaves locais e configure suas conexões novamente (ou restaure a partir de um backup `.cpmbackup` previamente salvo).

### O assistente PIKA não responde ou dá timeout.
1. Se estiver utilizando o **Ollama Local**, confirme se o aplicativo do Ollama está em execução no seu computador (`http://localhost:11434`) e se o modelo configurado foi baixado (`ollama run llama3.2`).
2. Se estiver utilizando o **Google Gemini Cloud**, certifique-se de que uma chave de API válida foi informada em **AI Settings**.
3. Verifique se um modelo de contingência (**Fallback**) foi configurado para assumir requisições em caso de lentidão temporária.

### Posso usar o CPM em monitores ultra-wide ou celulares?
Sim. A interface do CPM foi construída com layouts dinâmicos, barra lateral recolhível e tabelas com rolagem horizontal contida, adaptando-se com fluidez desde smartphones compactos até setups profissionais multi-monitores.

---

*Crypto Portfolio Manager — Conectividade Profissional, Inteligência Analítica e Segurança Zero-Trust.*
