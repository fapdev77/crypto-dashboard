# 📘 Manual do Utilizador - Crypto Portfolio Manager (CPM)

> **Versão da Aplicação:** 2.16.0  
> **Plataformas Suportadas:** Bybit (API V5 UTA), Bitget (API V2 Classic & UTA), OKX (API V5)  
> **Arquitetura de Segurança:** Zero-Trust Client-Side (Criptografia Web Crypto PBKDF2 + AES-GCM 256-bit)

Bem-vindo ao **Crypto Portfolio Manager (CPM)**! Este terminal profissional foi desenvolvido para consolidar, monitorizar e auditar em tempo real o seu património, desempenho operacional, saldos em carteira, posições abertas e históricas, estratégias de hedge delta-neutral, taxas de financiamento (funding rates) e histórico contabilístico de transações entre as principais corretoras de derivados de criptomoedas: **Bitget**, **Bybit** e **OKX**.

A nossa prioridade absoluta é a **segurança de nível zero-trust** e a **preservação integral da sua privacidade**: as suas chaves de API, palavras-passe e históricos operacionais permanecem estritamente sob a sua custódia local no navegador, nunca transitando ou sendo armazenados em bases de dados de terceiros.

---

## 📌 Índice

1. [Arquitetura de Segurança Zero-Trust](#1-arquitetura-de-segurança-zero-trust)
2. [Configuração Inicial e Chaves de API](#2-configuração-inicial-e-chaves-de-api)
   - [Configurações Regionais e Origem Bybit](#configurações-regionais-e-origem-bybit)
   - [Bitget: Seleção Classic vs UTA, Subcontas e Funding](#bitget-seleção-classic-vs-uta-subcontas-e-funding)
   - [OKX: Dual-Wallet (Trading e Funding)](#okx-dual-wallet-trading-e-funding)
3. [Palavra-passe Mestra Global, Cópias de Segurança Cifradas e Bloqueio Automático](#3-palavra-passe-mestra-global-cópias-de-segurança-cifradas-e-bloqueio-automático)
4. [Modo de Simulação (Mock Data)](#4-modo-de-simulação-mock-data)
5. [Terminal de Registos Integrado (Connection Logs)](#5-terminal-de-registos-integrado-connection-logs)
6. [Sincronização, Retenção e Definições de Cache (Settings)](#6-sincronização-retenção-e-definições-de-cache-settings)
7. [Guia de Ecrãs e Navegação Diária](#7-guia-de-ecrãs-e-navegação-diária)
   - [🏠 Painel Principal (Dashboard)](#-painel-principal-dashboard)
   - [⚡ Positions Ticker (Marquee em Tempo Real)](#-positions-ticker-marquee-em-tempo-real)
   - [🛡️ Hedge Pro Dashboard (Gestão Delta-Neutral e Contratos Inversos)](#-hedge-pro-dashboard-gestão-delta-neutral-e-contratos-inversos)
   - [💼 Open Positions (Posições Ativas — Detailed & Lite)](#-open-positions-posições-ativas--detailed--lite)
   - [📂 Closed Positions (Histórico de Posições e Analytics)](#-closed-positions-histórico-de-posições-e-analytics)
   - [📝 Relatórios de Ordens (Ordens Abertas e Histórico de Ordens)](#-relatórios-de-ordens-ordens-abertas-e-histórico-de-ordens)
   - [🔄 Histórico de Execuções (Trade History)](#-histórico-de-execuções-trade-history)
   - [📜 Histórico de Transações e Variação Líquida Consolidada](#-histórico-de-transações-e-variação-líquida-consolidada)
   - [📊 Desempenho do Portefólio (Portfolio Performance)](#-desempenho-do-portefólio-portfolio-performance)
   - [📈 Análise de Mercado (Market Analytics)](#-análise-de-mercado-market-analytics)
   - [📊 PnL por Símbolo (PnL by Symbol)](#-pnl-por-símbolo-pnl-by-symbol)
   - [💸 Painel de Taxas de Financiamento (Funding Fees)](#-painel-de-taxas-de-financiamento-funding-fees)
   - [📑 Relatórios (Exportação de Relatórios de Gestão)](#-relatórios-exportação-de-relatórios-de-gestão)
   - [⚡ Testador de API (API Tester)](#-testador-de-api-api-tester)
   - [👁️ Modo de Privacidade (Privacy Mode)](#-modo-de-privacidade-privacy-mode)
8. [Assistente PIKA (Portfolio Information & Knowledge Assistant)](#8-assistente-pika-portfolio-information--knowledge-assistant)
   - [Princípios de Segurança e Privacidade](#-princípios-de-segurança-e-privacidade)
   - [Fornecedores Suportados e Modelos Locais/Nuvem](#-fornecedores-suportados-e-modelos-locaisnuvem)
   - [Catálogo de Ferramentas Analíticas (Tool Calling)](#-catálogo-de-ferramentas-analíticas-tool-calling)
   - [Auditoria de Compatibilidade de Ferramentas](#-auditoria-de-compatibilidade-de-ferramentas)
   - [Telemetria Avançada, Gráficos Diários e Exportação](#-telemetria-avançada-gráficos-diários-e-exportação)
   - [Atalho Global e Gaveta de Chat](#-atalho-global-e-gaveta-de-chat)
9. [Normalização de Contratos Inversos e Precisão Numérica](#9-normalização-de-contratos-inversos-e-precisão-numérica)
10. [Preçagem Dinâmica de Tokens e Mecanismos de Recurso](#10-preçagem-dinâmica-de-tokens-e-mecanismos-de-recurso)
11. [Resiliência de Ligação, Fail-Fast e Limite Global de Erros](#11-resiliência-de-ligação-fail-fast-e-limite-global-de-erros)
12. [Suporte PWA (Instalar Aplicação no Computador e Dispositivo Móvel)](#12-suporte-pwa-instalar-aplicação-no-computador-e-dispositivo-móvel)
13. [Perguntas Frequentes (FAQ)](#13-perguntas-frequentes-faq)

---

## 1. Arquitetura de Segurança Zero-Trust

O CPM foi concebido sob um paradigma rigoroso de segurança descentralizada:
- **Sem Base de Dados Externa para Credenciais**: Não operamos nenhum servidor na nuvem que armazene as suas chaves de API ou histórico patrimonial. Toda a comunicação ocorre diretamente do seu navegador para os servidores oficiais das corretoras.
- **Armazenamento Seguro no Cliente (`localStorage`)**: As suas credenciais são guardadas estritamente no armazenamento local do navegador, podendo ser adicionalmente cifradas por palavra-passe mestra com algoritmos industriais (**PBKDF2 com 100.000 iterações e AES-GCM 256-bit**).
- **Proxy Inerte Local / Serverless (`server.ts` / `/api/proxy`)**: Para contornar restrições de CORS impostas por navegadores web, o CPM utiliza um proxy local de elevado desempenho. O cliente gera todas as assinaturas criptográficas (HMAC-SHA256, carimbos de data/hora) na ponta antes do envio. O proxy apenas reencaminha o payload para os endpoints oficiais sem alterar assinaturas, sem reter dados e sem conhecer as suas chaves secretas.
- **NUNCA utilize Chaves com Permissões de Levantamento ou Negociação**: A monitorização exige **estritamente permissões de LEITURA (Read-Only)**. Nunca crie nem utilize chaves com permissões para transferir fundos ou executar novas ordens.

---

## 2. Configuração Inicial e Chaves de API

Para ligar as suas contas reais ao terminal CPM:

1. **Gere Chaves de Leitura nas Corretoras:**
   - **Bybit**: API V5 (Read-only, permissões para Account, Position e Trade).
   - **OKX**: API V5 (Read-only, insira uma **Passphrase** segura configurada na criação da chave).
   - **Bitget**: API V2 (Read-only, exige **Passphrase**; suporte automático para contas Classic e UTA).
2. **Abra o Gestor de Chaves**: No menu lateral, aceda a **API Keys** e clique em **+ Add Exchange**.
3. **Preencha os Campos do Formulário:**
   - **Exchange**: Selecione Bitget, Bybit ou OKX.
   - **Label**: Um nome amigável para identificar a conta (ex: *Bybit UTA Principal*, *Bitget Arbitragem*). Mínimo de 3 caracteres; nomes duplicados por exchange são prevenidos automaticamente.
   - **API Key** e **API Secret**.
   - **Passphrase**: Obrigatório para Bitget e OKX.

### Configurações Regionais e Origem Bybit
Para utilizadores da Bybit, o modal disponibiliza seletores de ambiente e conformidade regulamentar:
- **Environment**: Alternância transparente entre **Mainnet** (Ambiente Real de Produção) e **Testnet** (Rede de Testes Simulada).
- **Account Region / Origin**: Encaminhamento direto para o domínio regulamentar correspondente:
  - *Global Default* (`api.bybit.com`)
  - *Netherlands* (`api.bybit.nl`)
  - *Turkey* (`api.bybit-tr.com`)
  - *Hong Kong* (`api.bybit.com.hk`)
  - *Kazakhstan* (`api.bybit.kz`)
  - *Georgia* (`api.bybit.com.ge`)
  - *Brazil International* (`api.bybit.com` com cabeçalho `x-site-id: 10001`)
  - *Argentina International* (`api.bybit.com` com cabeçalho `x-site-id: 10002`)

### Bitget: Seleção Classic vs UTA, Subcontas e Funding
- **Account Type**:
  - **Classic**: Para contas que operam no modelo tradicional de carteiras separadas (Spot e Mix/Futures).
  - **UTA (Unified Trading Account)**: Para contas de margem unificada Bitget.
- **Include Funding Account**: Quando selecionado, obtém e apresenta ativos na carteira de Funding/Spot.
- **Sub-account**: Identifica a ligação como subconta subordinada a uma conta principal.

### OKX: Dual-Wallet (Trading e Funding)
O adaptador da OKX consulta simultaneamente a conta de Trading Unificada (`/api/v5/account/balance`) e a conta de Funding (`/api/v5/asset/balances`). Os valores são consolidados no património global com identificadores visuais: `UNIFIED` para margem de negociação e `FUNDING` para depósitos passivos.

---

## 3. Palavra-passe Mestra Global, Cópias de Segurança Cifradas e Bloqueio Automático

Para proteger a sua informação financeira em dispositivos partilhados ou de escritório:

1. **Inicialização do Cofre**: Na primeira adição de chave de API, o CPM solicita a definição de uma **Palavra-passe Mestra** (mínimo de 8 carateres). Todas as credenciais são cifradas antes de guardadas em `localStorage` através de **PBKDF2-SHA256 com 600.000 iterações** e cifra **AES-GCM 256-bit**.
2. **Ecrã Global de Bloqueio**: Ao atualizar a página ou reabrir o separador, é apresentado um ecrã de desbloqueio que protege os dados contra acessos indevidos.
3. **Bloqueio Automático por Inatividade (`useVaultAutoLock`)**: Em **Definições** $\to$ **Segurança**, ative o temporizador configurável entre **1 e 60 minutos** (padrão: 15 minutos). Esgotado o tempo sem atividade, as chaves decifradas são instantaneamente purgadas da memória RAM.
4. **Bloqueio Manual Imediato**: Clique em **Bloquear Cofre Agora** para fechar a sessão instantaneamente.
5. **Cópia de Segurança Cifrada (`.cpmbackup`)**: Exporte todas as ligações e preferências num único ficheiro cifrado seguro.

---

## 4. Modo de Simulação (Mock Data)

Para testar o terminal ou realizar apresentações sem ligar chaves reais:
1. Aceda a **Definições (Settings)** na barra lateral.
2. Ative a opção **Modo de Simulação (Mock Data)**.
3. O terminal suspende as chamadas de rede externas e carrega dados realistas de teste para saldos, posições, ordens e métricas.

---

## 5. Terminal de Registos Integrado (Connection Logs)

Para total transparência técnica:
1. Clique em **Connection Logs** na barra lateral.
2. **Mascaramento Automático**: Um filtro por expressões regulares mascara automaticamente chaves de API, segredos e palavras-passe.
3. **Níveis de Registo**: `SYSTEM`, `DATA`, `WARN`, `ERROR`.

---

## 6. Sincronização, Retenção e Definições de Cache (Settings)

O CPM funciona com o padrão **SWR (Stale-While-Revalidate)** suportado por **IndexedDB**:
- **Carregamento Instantâneo**: Gráficos e tabelas são exibidos imediatamente a partir da cache local, enquanto os processos de fundo atualizam os dados.
- **Quota de Armazenamento**: Monitorização em tempo real do espaço utilizado no navegador.
- **Retenção de Histórico**: Períodos configuráveis de 30 a 730 dias com opção de limpeza de registos antigos.

---

## 7. Guia de Ecrãs e Navegação Diária

### 🏠 Painel Principal (Dashboard)
- **Património Total**: Saldo líquido consolidado em USD em todas as corretoras ligadas.
- **PnL Não Realizado**: Lucro/prejuízo flutuante nas posições de derivados ativas.
- **Utilização de Margem**: Rácio entre margem utilizada e garantia disponível.
- **Tabela Hierárquica de Saldos (`ExchangeHierarchyTable`)**: Visualização expansível organizada por Corretora $\to$ Subconta $\to$ Ativo.

### ⚡ Positions Ticker (Marquee em Tempo Real)
Barra contínua superior que apresenta cotações, sentido (Long/Short) e PnL flutuante das posições em aberto.

### 🛡️ Hedge Pro Dashboard (Gestão Delta-Neutral e Contratos Inversos)
Módulo dedicado na barra lateral concebido para arbitragem de taxas de financiamento e proteção de capital:
- **Proteção Real**: Posições Short em contratos inversos fixam o valor em USD ao `entryPrice`, protegendo o ativo subjacente contra desvalorizações.
- **Medidor de Exposição do Portefólio**: Barra gráfica tricolor (% Protegido, % Exposto, % Alavancagem).

### 💼 Open Positions (Posições Ativas — Detailed & Lite)
- Alternância entre visualização detalhada em cartões e formato de tabela compacta.
- Apresentação de Preço de Entrada, Preço Mark, Preço de Liquidação, ROE% e alavancagem efetiva.

### 📂 Closed Positions (Histórico de Posições e Analytics)
- Registo completo de posições encerradas com métricas de **Win Rate %**, **Profit Factor** e exportação para **CSV**, **Excel (.xlsx)** e **PDF**.

### 📝 Relatórios de Ordens (Ordens Abertas e Histórico de Ordens)
- Monitorização de ordens ativas (Limit, Market, Stop Loss, Take Profit) e arquivo histórico de execuções.

### 📜 Histórico de Transações e Variação Líquida Consolidada
- Apresentação consolidada de fluxos de caixa, taxas pagas e funding recebido com agrupamento por corretora e ativo.

---

## 8. Assistente PIKA (Portfolio Information & Knowledge Assistant)

O **PIKA** é o assistente analítico integrado no CPM:
- **Zero-Trust**: Não tem acesso às suas chaves de API secretas.
- **Estritamente Consultivo**: Sem capacidade para realizar ordens ou movimentar fundos.
- **Modelos Suportados**: Ollama local (100% privado), Google Gemini Cloud e fornecedores compatíveis com OpenAPI via OpenRouter.
- **Atalho Rápido**: Prima **`Ctrl + J`** (ou **`Cmd + J`** em macOS) em qualquer ecrã para abrir o assistente.

---

## 9. Normalização de Contratos Inversos e Precisão Numérica

Diferentes corretoras utilizam convenções distintas para contratos Linear (USDT-M) e Inverse (COIN-M). O CPM normaliza todas as grandezas para moedas-base e USD utilizando cálculos de alta precisão com a biblioteca **Big.js**, eliminando imprecisões de vírgula flutuante.

---

## 10. Preçagem Dinâmica de Tokens e Mecanismos de Recurso

Para tokens secundários que não possuem par direto USDT, o CPM utiliza rotas seguras de recurso com cotações dinâmicas atualizadas continuamente.

---

## 11. Resiliência de Ligação, Fail-Fast e Limite Global de Erros

- **Deteção Rápida de Falha (Fail-Fast)**: Credenciais inválidas abortam imediatamente tentativas redundantes para evitar bloqueios temporários de IP pelas corretoras.
- **Recuperação Segura**: Qualquer falha inesperada aciona o ecrã de recuperação do CPM com opção de recarregamento e limpeza de cache.

---

## 12. Suporte PWA (Instalar Aplicação no Computador e Dispositivo Móvel)

O CPM pode ser instalado como Progressive Web App (PWA) no Google Chrome, Microsoft Edge ou Safari, proporcionando uma experiência de aplicação nativa e acesso rápido a partir do ambiente de trabalho.

---

## 13. Perguntas Frequentes (FAQ)

### A minha chave de API não liga. O que devo verificar?
1. Confirme se selecionou a corretora correta.
2. Na Bitget e OKX, certifique-se de que inseriu a **Passphrase** exata.
3. Na Bybit, verifique se a sua conta pertence a uma região específica (Holanda, Turquia, Brasil/Argentina) e selecione a respetiva origem.

### Posso recuperar uma palavra-passe mestra esquecida?
Não, devido ao modelo de segurança zero-trust. Em caso de perda, reinicie os dados locais através do botão de reposição e volte a introduzir as chaves.

---

*Crypto Portfolio Manager — Conectividade Profissional Multi-Exchange, Análise Avançada e Segurança Zero-Trust.*
