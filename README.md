# Crypto Portfolio Manager: Multi-Exchange

[![Version](https://img.shields.io/badge/version-2.29.0-blue.svg)](package.json)
[![Tests](https://img.shields.io/badge/tests-763%20passed-success.svg)](specs/PRD.md)
[![License](https://img.shields.io/badge/license-Apache%202.0-green.svg)](LICENSE)
[![Security](https://img.shields.io/badge/security-Zero--Trust%20Client-orange.svg)](user_manual/cpm_user_manual_pt-br.md)

Um gerenciador de portfólio, terminal analítico institucional e auditor contábil avançado para consolidar saldos, posições abertas e históricas, risco de hedge delta-neutral, taxas de financiamento (funding rates) e histórico completo de transações em tempo real entre as corretoras **Bitget**, **Bybit** e **OKX**.

---

## 🚀 Visão Geral e Arquitetura Zero-Trust

O **Crypto Portfolio Manager (CPM)** foi construído com a premissa fundamental de **Zero-Trust Security**:
- **Nenhuma Credencial em Servidores Terceiros**: Não existem bancos de dados na nuvem armazenando suas chaves de API, senhas ou histórico patrimonial. Todas as credenciais residem exclusivamente no armazenamento local do seu navegador (`localStorage`).
- **Criptografia Militar no Cliente**: As chaves são protegidas por Senha Mestra utilizando algoritmos nativos da **Web Crypto API (PBKDF2 com 600.000 iterações + AES-GCM 256-bit)**, com bloqueio global de sessão (`GlobalUnlockScreen`), tela de migração mandatória de credenciais legadas (`MandatoryVaultMigrationScreen`) e suporte a exportação/importação de backups cifrados (`.cpmbackup`).
- **Proxy Inerte Local e Serverless (`server.ts` & `/api/proxy.ts`)**: Para contornar restrições de CORS impostas pelos navegadores, o sistema utiliza um relé de alta performance em Node.js/Express. O frontend assina todas as requisições na ponta do cliente gerando os cabeçalhos criptográficos correspondentes. O proxy repassa os dados aos endpoints oficiais das corretoras de forma transparente, sem reter dados, sem manter logs sensíveis e com validação rígida de allowlist para prevenir SSRF.
- **Auditor Quantitativo PIKA com Modo Privacidade**: Assistente analítico integrado que opera exclusivamente via chamadas de ferramentas de leitura local (Local Tool-Calling), convertendo automaticamente valores nominais em proporções percentuais quando o Modo Privacidade estiver ativo.

---

## ⚙️ Tecnologias Utilizadas (A Stack)

- **Frontend & Interface**: React 19, TypeScript ~5.8, **Vite 6**, **Tailwind CSS v4**, **Lucide React** para ícones otimizados e Radix UI para tooltips conceituais.
- **Internacionalização (i18n)**: **i18next** e **react-i18next** com suporte dinâmico a 6 idiomas completos (`pt-BR`, `pt-PT`, `en-US`, `en-GB`, `es-419`, `it-IT`), mantendo terminologias técnicas de mercado padronizadas.
- **Multi-Moedas & Câmbio Fiat**: Conversão cambial em tempo real integrada à **Frankfurter API** com fallback em cache offline local para exibição fluida em USD, BRL, EUR e GBP sem duplicações de sufixo monetário.
- **Gerenciamento de Estado**: **Zustand 5.0** com arquitetura desacoplada de micro-stores de alta coesão:
  - `useBalancesStore` (saldos consolidados e fatias de carteira)
  - `usePositionsStore` (posições ativas e margens)
  - `useOrdersStore` (ordens em aberto)
  - `useApiKeysStore` (persistência segura e criptografia de chaves)
  - `useConnectionStore` (conectividade em tempo real)
  - `useFundingStore` (taxas de funding e auto-sync)
  - `useMarketAnalyticsStore` (indicadores quantitativos e regimes de mercado)
  - `useAiChatStore`, `useAiSettingsStore` e `useAiTelemetryStore` (subsistema do PIKA AI)
  - `useSettingsStore` (preferências globais, moeda base, idioma, TTL de símbolos e intervalos)
  - `useLogStore` (terminal de logs do sistema)
  - `usePwaUpdateStore` (ciclo de vida e atualização do Service Worker)
- **Persistência e Cache**: **IndexedDB** (`idb` 8.0) estruturado em 14 object stores sob o padrão **SWR (Stale-While-Revalidate)**, com ferramentas de auto-reparo de integridade, medição de quota e expurgo seletivo (pruning de 30d a 2 anos).
- **Aritmética Financeira**: **Big.js** para cálculos de alta precisão em taxas de funding, ratios de hedge e fluxo de caixa contábil.
- **Subsistema de IA**: `@google/genai` (SDK 1.29.0) para Google Gemini Cloud, client REST nativo para Ollama local (`localhost:11434`), `react-markdown` e `remark-gfm`.
- **Relatórios & Gráficos**: **Recharts 3.8** (curvas de Open Interest, CVD, Hedge Pro e gráficos de tokens), **jsPDF** com **jsPDF-AutoTable** e **SheetJS (xlsx)**.
- **Testes Automatizados**: **Vitest 4.1** com jsdom e `@testing-library/react`. Suíte abrangente com **88 arquivos de teste e 763 testes unitários e de integração automatizados** 100% verdes.

---

## 📦 Configuração Inicial e Execução

### Pré-requisitos
- Node.js (versão `>=24` recomendada).
- Gerenciador de Pacotes `npm`.

### 1. Instalação de Dependências
Clone ou faça o download do repositório e execute na raiz do projeto:
```bash
npm install
```

### 2. Execução em Desenvolvimento
Inicia o servidor Express (Proxy reverso) e o servidor de desenvolvimento do Vite na porta padrão `3000`:
```bash
npm run dev
```
Acesse a aplicação no seu navegador em: `http://localhost:3000`

### 3. Build e Execução em Produção
```bash
# 1. Compilar os assets estáticos com otimizações de árvore e Tailwind CSS v4
npm run build

# 2. Iniciar o servidor integrado para distribuição dos assets da pasta /dist
npm start
```

### 4. Verificação de Tipos e Testes
```bash
# Validação estrita de tipagem TypeScript (zero erros)
npm run lint

# Execução completa da suíte de 763 testes automatizados
npm test
```

---

## 🛠 Principais Funcionalidades e Recursos

### 1. PIKA Assistant (Portfolio Information & Knowledge Assistant — v2.0+)
- **Auditor Quantitativo com 9 Ferramentas de Leitura**:
  - `get_consolidated_balances`, `get_open_positions`, `get_order_history`, `get_funding_rates`, `get_hedge_pro_metrics`, `get_market_analytics`, `get_transaction_summary`, `get_exchange_connection_health`, `get_pnl_by_symbol`.
- **Arquitetura Multi-Provedor**:
  - **Ollama Local (100% Privado)**: Comunica-se com o Ollama em `http://localhost:11434`, descobre modelos locais (`llama3.2`, `qwen2.5`) e audita compatibilidade com Tool Calling.
  - **Google Gemini Cloud**: Integração de alta performance via SDK `@google/genai`.
  - **OpenRouter / Provedores Customizados**: Chaves salvas exclusivamente no navegador com política de fallback automático.
- **Proteção no Modo Privacidade**: Converte dados sensíveis em porcentagens quando o Privacy Mode estiver ativado.
- **Telemetria Completa e Auditoria**: Gráfico diário de consumo de tokens, tempo de resposta, histórico de requisições com visualizador de JSON bruto e exportação de relatórios em JSON/CSV.
- **Atalho Global**: Pressione **`Ctrl + J`** (ou **`Cmd + J`** no macOS) para alternar o drawer lateral.

### 2. Hedge Pro Dashboard (Gestão Delta-Neutral em Contratos Inversos)
- Promovido a módulo de primeiro nível na navegação lateral.
- **Modelo de Risco Beyond-100%**:
  - *Short em Contratos Inversos (COIN-M)*: Trava o valor em USD no preço de entrada (`entryPrice`), garantindo proteção do ativo base contra quedas de mercado até o limite do saldo.
  - *Long em Contratos Inversos*: Representa exposição direcional pura com efeito de alavancagem.
- **Portfolio Exposure Bar**: Barra visual tricolor destacando % Protegido, % Exposto e Extensão de Alavancagem.
- **Tabela de Resumo por Moeda**: Acompanhamento de saldos, montante protegido/exposto e alertas visuais de sobre-exposição (*Overexposed*).
- **Gráficos Decompostos**: `HedgeProBreakdownChart` e `HedgeProCapitalExposureChart` com gaveta expansível de posições individuais.

### 3. Portfolio Performance (Auditoria de Evolução Patrimonial e Métricas Institucionais)
- Novo painel analítico no topo do menu **Analytics**, fiel ao modelo executivo de performance e glossário quantitativo:
  - **Balance Evolution & Cash Flow**: Gráfico de área dual correlacionando a curva de evolução patrimonial (`Balance Evolution`) com a variação líquida acumulada (`Cumulative Net Change / Net Result`).
  - **Desempenho Temporal**: Gráficos de barras interativos com decomposição de PnL por **Mês** e por **Dia da Semana** (segunda a domingo).
  - **Price Milestone Analysis**: Análise de desempenho por marcos de preço com presets dinâmicos e intervalo configurável.
  - **Resultados Primários & Retorno**: Capital Investido, Saldo Final, Resultado Bruto, Resultado Líquido, ROI Líquido %, Retorno Acumulado e Taxa Anualizada.
  - **Operações e Taxas**: Contagem total de transações, segregação de Trades vs Depósitos/Saques, Trading Fees vs Funding Fees vs Transferências e Razão de Arrasto de Taxas (**Fee Drag Ratio**).
  - **Métricas Avançadas de Risco & Consistência**:
    - **Profit Factor**: Razão Ganhos Brutos / Perdas Brutas com badges qualitativos (*Excellent*, *Good*, *Acceptable*, *Poor*).
    - **Win Rate**: Taxa percentual de períodos diários positivos.
    - **Consistency Index**: Índice de dispersão normalizada dos retornos diários com classificação de consistência (*High Consistency*, *Moderate*, *High Dispersion*).
  - **Arquitetura de Alta Performance**: Período padrão inicial em **7 dias**, amostragem inteligente reduzida a 80 pontos, animações Recharts desativadas para renderização instantânea e seletores atômicos no Zustand para evitar re-renderizações durante sincronizações em segundo plano.

### 4. Market Analytics (Inteligência Quantitativa Cross-Exchange)
- **Multi-Market Overview**:
  - *Seletor de Ativos com Favoritos* persistidos no `localStorage`.
  - *Monitor de Open Interest (OI) & Alavancagem* correlacionando preço e volume em aberto em USD.
  - *Detector Algorítmico de Regime de Mercado*: `Long Accumulation`, `Short Squeeze`, `Aggressive Shorting`, `Long Liquidation`, `Neutral Consolidation`.
  - *Scanner de Arbitragem de Funding*: Identifica discrepâncias de taxas entre Bybit, OKX e Bitget com spread 8h e APR anualizado delta-neutro (`Spread APR = Spread * 3 * 365`).
  - *Cumulative Volume Delta (CVD)*: Rastreamento de agressões de mercado (`Net Delta = Taker Buy - Taker Sell`) com alertas de divergência altista e baixista.
  - *Sentimento Smart Money vs Retail*: Proporção Long/Short do varejo comparada ao top 20% de operadores nocionais.
  - *Auto-Refresh com Contador Circular*: Intervalos de 5s a 60s ou modo pausado.
- **Inverse Coin-M Dashboard**: Visão analítica exclusiva para contratos na moeda com desdobramento expansível por corretora e controles de Expand/Collapse All.

### 5. Conectividade Especializada por Corretora
- **Bybit (API V5 UTA)**:
  - Suporte a ambientes **Mainnet** e **Testnet**.
  - Roteamento multi-regional: Global (`api.bybit.com`), Holanda (`api.bybit.nl`), Turquia (`api.bybit-tr.com`), Hong Kong (`api.bybit.com.hk`), Cazaquistão e Geórgia.
  - Injeção automática de cabeçalhos de conformidade para contas internacionais do Brasil (`x-site-id: 10001`) e Argentina (`x-site-id: 10002`).
- **Bitget (API V2 Classic & UTA)**:
  - Adaptadores dedicados: `BitgetClassicAdapter` (carteiras segregadas Spot e Mix/Futures) e `BitgetUTAAdapter` (conta unificada).
  - Precificação dinâmica de ativos via `/api/v2/spot/market/tickers` e proxy fallback (`fetchTokenUsdPrice`).
  - Marcação de subcontas (`isSubAccount`) e controle de inclusão da carteira de funding (`includeFunding`).
- **OKX (API V5 Dual-Wallet)**:
  - Leitura concorrente da conta de trading (`/api/v5/account/balance`) e da carteira de financiamento (`/api/v5/asset/balances`).
  - Segregação visual explícita com tags `UNIFIED` e `FUNDING`.

### 6. Auditoria Contábil de Transações & Consolidated Net Change
- **Consolidated Net Change Dashboard**:
  - Painel unificado no topo de **Transactions History** com 4 macro KPI cards consolidados (*Total Tx*, *Total Funding*, *Total Fees*, *Net Change*).
  - Agrupamento hierárquico: Primeiro por Corretora, depois por Criptomoeda/Ativo.
  - Seções expansíveis com detalhamento de volume, taxas, funding recebido/pago e variação líquida nominal e em USD.
  - Exportação completa em **CSV**, **Excel (.xlsx)** e **PDF** auditável.
  - Totalmente integrado aos controles de privacidade e sincronização multi-corretora.
- **Transações Específicas (Bybit, Bitget e OKX)**:
  - Sincronização profunda progressiva em blocos de 7 dias com checkpoints no IndexedDB (até 2 anos de histórico).
  - Navegação dinâmica na sidebar (exibe apenas corretoras com contas ativas ou modo simulação).
  - **Mapeador Universal (10 Categorias)**: Trade & Orders, Funding Fee, Transfer In, Transfer Out, Liquidation, Interest, Rewards, Delivery, Others, All Types.
  - **Modal de Detalhes com Total Stats Summary**: Resumo consolidado de volume total, taxas líquidas e variação cambial.
  - Reconciliação contábil por fluxo de caixa: `Net Change = Cashflow + Funding - Fees`.

### 7. Funding Fees Dashboard
- Pipeline de agregação pré-calculada no serviço (`FundingService`) com armazenamento condensado (`FundingRateSummary`) no IndexedDB.
- Análise multi-período: Next, Last, Today, Mês Atual, Mês Anterior, 3M, 6M, 1Y (excluindo mês corrente de janelas multi-mês).
- Comparador horizontal de taxas com filtros de Favoritos, Posições Abertas e COIN-M / Inverse.
- Auto-sync inteligente agendado para `próximo acerto de funding + 60s`.

### 8. Segurança Reforçada, Migração Obrigatória de Vault e Resiliência
- **Criptografia Militar Local (PBKDF2 600.000 iterações + AES-GCM-256)**: Proteção completa de chaves e dados sensíveis via Web Crypto nativa, sem envio de credenciais a servidores.
- **Migração Obrigatória de Vault (`MandatoryVaultMigrationScreen`)**: Força a migração segura para o formato encriptado de 600k iterações caso chaves em texto plano sejam detectadas.
- **Aviso de Configuração de Cofre (`VaultSetupNoticeModal`)**: Alerta não intrusivo para guiar o usuário na ativação da senha mestra com lembrete configurável.
- **Consolidação de Allowlist Anti-SSRF**: Validação centralizada e estrita de domínios permitidos em `server.ts` e `/api/proxy.ts`.
- **Fail-Fast de Autenticação**: Cancela retries automáticos imediatamente em caso de credenciais inválidas para blindar o IP do cliente contra bloqueios Cloudflare/Akamai.
- **Backoff Exponencial com Jitter e Circuit Breaker**: Recuperação suave para quedas de internet e erros 5xx.
- **Global Error Boundary**: Tela de recuperação graciosa (**Safe Recovery**) com ações em 1 clique ("Reload Dashboard" e "Clear Cache & Reload").
- **Auto-Reset de Scroll**: Reposiciona a rolagem para o topo instantaneamente ao alternar abas (`useLayoutEffect`).

### 9. PWA, Modo Simulação e Modo Privacidade
- **Progressive Web App (PWA)**: Instalação nativa Desktop/Mobile com Service Worker, cache offline e avisos discretos de atualização (`UpdateNotification`).
- **Modo Simulação (Mock Data)**: Injeta dados simulados completos e pausa conexões de rede para testes seguros de interface.
- **Modo Privacidade (Privacy Mode)**: Mascaramento instantâneo de valores financeiros com um clique no botão de olho e proteção automática no auditor PIKA AI.
- **Positions Ticker**: Marquee deslizante contínuo no topo espelhando posições em aberto e cotações ao vivo.

### 10. Internacionalização Completa (6 Idiomas Nativos) & Multi-Moedas Fiat
- **Suporte Nativo a 6 Idiomas**:
  - `pt-BR` (Português do Brasil)
  - `pt-PT` (Português de Portugal)
  - `en-US` (English - US)
  - `en-GB` (English - UK)
  - `es-419` (Español Latinoamericano)
  - `it-IT` (Italiano)
- **Localização Contextual Abrangente**: 100% de cobertura nos 6 cards de Settings, modais de confirmação, badges analíticos, tooltips conceituais (Radix UI) e toasts de notificação (`react-hot-toast`).
- **Seletor de Datas Internacionalizado e Seguro**: Modais com formatação localizada de calendário e atalhos rápidos (`Hoje`, `Ontem`, `Últimos 7d`, `Últimos 30d`, etc.) sem alterar o padrão ISO/UTC das consultas de APIs (`yyyy-MM-dd`).
- **Preservação de Terminologias Técnicas**: Termos consolidados de mercado mantidos padronizados em todos os idiomas (`Long`, `Short`, `Inverse`, `Coin-M`, `Spot`, `Perp`, `USDT-M`, `Maker/Taker`).
- **Sistema Multi-Moedas com Câmbio em Tempo Real**:
  - Exibição de valores na moeda de preferência do usuário (**USD**, **BRL**, **EUR**, **GBP**).
  - Cotações atualizadas via **Frankfurter API** com fallback automático em cache offline local.
  - Indicador de status cambial transparente (`live`, `cached`, `fallback`).
  - Formatação monetária limpa e padronizada (ex: `R$ 1.250,00`), eliminando sufixos hardcoded concorrentes (`(USD)` ou `USD`).

### 11. Governança de Cache, Armazenamento e Configurações Avançadas
- **IndexedDB Engine v12**: 14 object stores otimizadas sob padrão Stale-While-Revalidate (SWR).
- **Monitoramento de Quota e Saúde de Armazenamento**: Medição periódica via `navigator.storage.estimate()` exibindo disco consumido, percentual e limites do navegador.
- **Expurgo Seletivo sob Demanda (Prune History)**: Janelas de retenção configuráveis (30d a 2 anos) para limpar transações e ordens antigas preservando conexões e configurações.
- **Ferramentas de Manutenção e Auto-Reparo**: Botões dedicados para diagnóstico, auto-reparo e redefinição de integridade do cache local.
- **Governança Granular de Polling e Catálogo**:
  - *Asset Metadata TTL*: Duração do cache de símbolos e especificações de contrato em IndexedDB (1h a 24h).
  - *History Background Refresh*: Intervalo de checagem periódica em segundo plano de novas ordens e posições (1m a 60m).
  - *Onboarding Guide Toggle*: Controle para exibir ou ocultar o guia introdutório ao iniciar a aplicação.

---

## 📚 Documentação Técnica e Manuais

Todos os manuais e especificações técnicas estão disponíveis no repositório:
- 📖 [Manual do Usuário (Português do Brasil)](./user_manual/cpm_user_manual_pt-br.md)
- 📖 [Manual do Utilizador (Português de Portugal)](./user_manual/cpm_user_manual_pt-pt.md)
- 📖 [User Manual (English - US)](./user_manual/cpm_user_manual_en-us.md)
- 📖 [User Manual (English - UK)](./user_manual/cpm_user_manual_en-gb.md)
- 📖 [Manual de Usuario (Español Latinoamericano)](./user_manual/cpm_user_manual_es-419.md)
- 📖 [Manuale Utente (Italiano)](./user_manual/cpm_user_manual_it-it.md)
- 📐 [Product Requirements Document (PRD)](./specs/PRD.md): Especificação de produto, regras de negócio e matriz de requisitos funcionais.
- 🏛 [Technical Specifications & Architecture](./specs/ARCHITECTURE.md): Detalhamento do Hybrid-Proxy, micro-stores, engines de sincronização e subsistema de IA.
- 📑 [Unified Interfaces Specification](./specs/unified-interfaces.md): Definição de tipos TypeScript e mapeamento de payloads de API.

---

*Crypto Portfolio Manager — Institutional Analytics, Delta-Neutral Intelligence & Zero-Trust Security.*
