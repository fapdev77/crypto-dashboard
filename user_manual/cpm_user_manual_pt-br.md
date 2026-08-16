# 📘 Manual do Usuário - Crypto Portfolio Manager (CPM)

Bem-vindo ao **Crypto Portfolio Manager (CPM)**! Este terminal foi desenvolvido para consolidar e monitorar, em tempo real, seu desempenho operacional, saldos, posições ativas, risco de hedge e histórico de ordens entre as corretoras **Bitget**, **Bybit** e **OKX**.

Nossa prioridade absoluta é a **segurança de nível zero-trust** e a **preservação de privacidade**, garantindo que seus dados e credenciais de API permaneçam sempre em seu controle local.

---

## 📌 Sumário

1. [Arquitetura de Segurança Zero-Trust](#1-arquitetura-de-segurança-zero-trust)
2. [Configuração Inicial e Chaves de API](#2-configuração-inicial-e-chaves-de-api)
3. [Senha Mestra Global e Backups Criptografados](#3-senha-mestra-global-e-backups-criptografados)
4. [Modo Simulação (Mock Data)](#4-modo-simulação-mock-data)
5. [Terminal de Logs Integrado (Connection Logs)](#5-terminal-de-logs-integrado-connection-logs)
6. [Sincronização e Configurações de Cache (Settings)](#6-sincronização-e-configurações-de-cache-settings)
7. [Guia de Telas e Navegação Diária](#7-guia-de-telas-e-navegação-diária)
   - [Dashboard Principal](#-dashboard-principal)
   - [WorkSpace (Área de Trabalho Customizável)](#-workspace-área-de-trabalho-customizável)
   - [Open Positions (Posições Ativas)](#-open-positions-posições-ativas)
   - [Hedge Pro Dashboard (Gestão de Contratos Inversos)](#-hedge-pro-dashboard-gestão-de-contratos-inversos)
   - [Closed Positions (Histórico de Posições)](#-closed-positions-histórico-de-posições)
   - [Order Reports (Ordens Abertas e Histórico de Ordens)](#-order-reports-ordens-abertas-e-histórico-de-ordens)
   - [Trade History (Histórico de Execuções)](#-trade-history-histórico-de-execuções)
   - [PnL by Symbol (Lucros e Perdas por Símbolo)](#-pnl-by-symbol-lucros-e-perdas-por-símbolo)
   - [Dashboard de Taxas de Financiamento (Funding Fees)](#-dashboard-de-taxas-de-financiamento-funding-fees)
   - [Histórico de Transações Bybit (Transaction Log)](#-histórico-de-transações-bybit-transaction-log)
   - [API Tester (Testador de Conexões e Endpoints)](#-api-tester-testador-de-conexões-e-endpoints)
   - [Modo Privacidade (Privacy Mode)](#-modo-privacidade-privacy-mode)
8. [Padronização de Contratos Inversos e Paginação](#8-padronização-de-contratos-inversos-e-paginação)
9. [Exportação de Relatórios Operacionais](#9-exportação-de-relatórios-operacionais)
10. [Suporte a PWA (Instalar App)](#10-suporte-a-pwa-instalar-app)
11. [Solução de Problemas Comuns (FAQ)](#11-solução-de-problemas-comuns-faq)

---

## 1. Arquitetura de Segurança Zero-Trust

O CPM foi projetado sob um paradigma rígido de segurança descentralizada:
- **Sem Servidor de Terceiros**: Não possuímos bancos de dados na nuvem que armazenam suas credenciais. Toda a comunicação ocorre de forma direta do seu navegador para os servidores das exchanges.
- **Armazenamento Seguro Local**: Suas chaves de API são armazenadas exclusivamente no `localStorage` do seu navegador, protegidas por criptografia client-side de nível militar.
- **NUNCA use Chaves com Permissões de Saque ou Trade**: O monitoramento exige **estritamente permissões de LEITURA (Read-Only)**. Nunca crie chaves com permissões para enviar fundos ou abrir operações.

---

## 2. Configuração Inicial e Chaves de API

Para conectar suas contas reais ao terminal CPM, siga o passo a passo:

1. **Acesse as Corretoras** e crie uma nova chave de API de **Leitura**:
   - **Bybit**: API V5 (Read-only, permissões para Account, Position e Trade).
   - **OKX**: API V5 (Read-only, insira uma senha de Passphrase que você configurou na chave).
   - **Bitget**: API V2 (Read-only, exige Passphrase e a comunicação passa por um proxy reverso interno devido a restrições de CORS do navegador).
2. **Abra o Painel de Configurações**: No menu lateral, acesse **API Keys**.
3. **Adicione uma Conexão**:
   - Clique em **Add New Key**.
   - Selecione a Corretora correspondente.
   - Preencha o **Label** (nome para identificar a conta, ex: *Conta Principal*), a **API Key**, o **API Secret** e a **Passphrase** (caso aplicável).
   - Clique em **Save Connection**.
4. **Verifique o Status**: A conexão será iniciada. Um indicador visual exibirá o status em tempo real (Verde para Conectado, Vermelho para Erros com diagnóstico preciso).

---

## 3. Senha Mestra Global e Backups Criptografados

Para elevar a segurança local em computadores compartilhados ou de uso diário, o CPM conta com um módulo de criptografia e proteção por Senha Mestra:

1. **Bloqueio Global de Sessão (Global Unlock Screen)**:
   - Configure uma Senha Mestra nas configurações de segurança (**Security Settings**).
   - Todas as chaves de API são criptografadas em repouso com algoritmo padrão **AES-GCM** e derivação de chave **PBKDF2** (com sal único e 100.000 iterações).
   - Ao recarregar ou reabrir o aplicativo, uma tela de bloqueio impede qualquer acesso ou leitura de dados até que a senha correta seja inserida.
2. **Exportação de Backups Criptografados (`.cpmbackup`)**:
   - Exporte com 1 clique todo o conjunto de chaves e configurações em formato criptografado.
   - O arquivo gerado pode ser transferido com segurança para outro dispositivo ou guardado em cofre de senhas offline.
3. **Restauração de Backup**:
   - Importe seu arquivo `.cpmbackup` e digite a senha mestra para restaurar imediatamente todas as contas e configurações.

---

## 4. Modo Simulação (Mock Data)

Se você deseja experimentar a interface e as ferramentas analíticas sem inserir suas chaves reais de API, o CPM oferece um **Modo Simulação** robusto:

1. Acesse a aba **Settings** no menu lateral.
2. Ative a opção **Use Mock Data (Simulation Mode)**.
3. **O que acontece ao ativar**:
   - A sincronização automática com as APIs reais é pausada imediatamente.
   - O aplicativo carrega um banco de dados simulado contendo saldos multi-ativos, ordens abertas, histórico de posições, transações Bybit e métricas de hedge.
   - Um alerta visual amarelo **"Simulation Mode"** aparecerá no topo da tela.
   - Botões de sincronização manual de histórico são desativados para evitar chamadas de API inválidas.

---

## 5. Terminal de Logs Integrado (Connection Logs)

Para que você possa acompanhar cada requisição, autenticação e evento de comunicação REST, desenvolvemos um terminal de log profissional em uma página dedicada:

1. **Acesso Dedicado**: Acesse a aba **Connection Logs** diretamente pelo menu lateral para visualizar o terminal.
2. **Máscara de Segredos (Zero-Leak)**: O terminal possui filtros inteligentes para garantir que suas chaves de API, Passphrases ou assinaturas criptográficas **nunca apareçam em texto puro nos logs**.
3. **Filtros por Categoria**: 
   - `SYSTEM`: Inicialização de módulos e reconexões de rede.
   - `DATA`: Entrada de atualizações de saldo e feeds de preços.
   - `WARN` / `ERROR`: Alertas de conexão lenta, expiração de tokens ou erros nas credenciais de API.
4. **Busca Local por Texto**: Digite termos ou utilize expressões regulares (regex) na barra de busca para localizar eventos de ativos específicos.

---

## 6. Sincronização e Configurações de Cache (Settings)

Para garantir um carregamento ultrarrápido das suas informações e evitar que as corretoras bloqueiem o acesso (rate limiting), o aplicativo salva seu histórico de posições, ordens e taxas de financiamento no seu navegador (Cache local IndexedDB).

Através da tela **Settings** no menu lateral, você pode controlar o funcionamento do aplicativo:
- **Intervalos de Atualização (Polling)**: Ajuste com que frequência o sistema busca novas ordens, posições ou taxas de financiamento.
- **Limpeza Seletiva de Cache (Clear Data)**: Se desejar forçar a atualização completa de dados das corretoras, use os botões específicos (*Clear Orders Cache*, *Clear Funding Cache*, *Clear Bybit TxLog*).
- **Wipe All Local Client Data (Apagar Tudo)**: Na Danger Zone, redefine o aplicativo para as configurações de fábrica, limpando chaves, preferências e bancos de dados locais.
- **Simulation Mode**: Ative ou desative o modo de simulação a qualquer momento.

---

## 7. Guia de Telas e Navegação Diária

### 🏠 Dashboard Principal
Seu painel analítico central, composto por uma estrutura elegante de cartões:
- **Balanço Consolidado**: Soma dos saldos de todas as carteiras e subcontas conectadas.
- **Alocação por Corretora**: Gráfico Donut mapeando sua distribuição de capital e risco de custódia.
- **Treemap de Ativos**: Distribuição visual dos seus criptoativos cross-exchange por tamanho de capital.
- **Capital Protection & Hedge**: Painel dedicado a apontar desequilíbrios entre posições Long e Short ativas para evitar liquidações em cascata.

### 🗂 WorkSpace (Área de Trabalho Customizável)
Uma visão multimodular personalizável para traders e gestores de portfólio:
- **Cards Dinâmicos**: Acompanhe simultaneamente cotações, tickers rápidos, resumo de saldos e posições ativas em um único painel integrado.
- **Flexibilidade Operacional**: Ideal para monitoramento contínuo em telas secundárias ou setups multi-monitor.

### 💼 Open Positions (Posições Ativas)
Monitoramento em tempo real de suas posições ativas de derivativos (Futuros Perpétuos e Contratos Inversos):
- **ROE% e PnL não realizado**: Indicadores de lucratividade ajustados pelo preço de marcação em tempo real.
- **Preço de Liquidação e Margem**: Alertas visuais mudam de cor conforme a posição se aproxima do preço de liquidação.
- **Coin Icon Auto-Fallback**: Componente unificado que categoriza e renderiza o logo correto de cada criptoativo com fallbacks dinâmicos.
- **Paginação Integrada**: Navegue com fluidez entre páginas de posições abertas com controle de itens por página.

### 🛡 Hedge Pro Dashboard (Gestão de Contratos Inversos)
Um módulo analítico avançado projetado especificamente para traders de arbitragem de funding e estratégias delta-neutral em contratos COIN-M (Inversos):
- **Cálculo de Proteção Real (Locked USD Entry)**: Posições Short em contratos inversos travam o valor em USD no preço de entrada (`entryPrice`), garantindo proteção do capital contra desvalorização do ativo subjacente (limitado pelo saldo da moeda).
- **Exposição Direcional e Alavancagem**: Posições Long em contratos inversos não protegem o capital; o saldo e o valor da posição são contabilizados como exposição pura mais alavancagem direcional.
- **Barra de Exposição do Portfólio (Beyond-100% Model)**: Barra visual indicando a proporção de capital protegido, capital exposto e a extensão de alavancagem sobre o patrimônio total.
- **Resumo por Moeda (Coin Summaries)**: Tabela consolidada por moeda/conta destacando saldo na moeda, valor em USD, valor protegido, valor exposto, número de posições e alertas visuais de **Sobre-exposição (Overexposed)**.
- **Gráfico de Decomposição (Breakdown Chart)**: Visão gráfica comparativa de Protegido vs Exposto vs Alavancado por ativo.

### 📂 Closed Positions (Histórico de Posições)
- **Análise Estatística**: Exibe métricas de desempenho chave como **Win Rate %**, **Profit Factor**, Médias de Ganho/Perda e Maior Trade Executado.
- **Auditoria de PnL**: Visualize o PnL final consolidado por posição, tempo em que a posição ficou aberta e taxa de ROE%.
- **Exportação Rápida**: Baixe o histórico de posições encerradas em formato CSV, Excel (.xlsx) ou PDF.

### 📝 Order Reports (Ordens Abertas e Histórico de Ordens)
- **Open Orders**: Monitore todas as suas ordens pendentes (Limit, Stop Loss, Take Profit) com suporte a paginação e cancelamento/visualização de gatilhos.
- **Order History**: Tabela interativa com busca regex avançada para ordens executadas ou canceladas, permitindo expandir linhas para ver detalhes completos de execução.

### 🔄 Trade History (Histórico de Execuções)
Uma visualização detalhada de todas as execuções de ordens e trades preenchidos nas corretoras:
- **Histórico Completo**: Acompanhe preço exato de execução, quantidade (size), lado (Buy/Sell) e papel (Taker/Maker).
- **Auditoria de Taxas**: Verifique quanto você pagou ou recebeu de taxa de execução (fees) por trade, com destaque para a moeda utilizada.
- **Paginação e Filtros**: Paginação fluida e busca rápida por símbolo ou corretora.

### 📊 PnL by Symbol (Lucros e Perdas por Símbolo)
Um relatório gerencial para analisar a performance individual de cada ativo operado:
- **Métricas Agregadas**: Visualize Total de Ganhos, Total de Perdas, PnL Líquido (Net PnL), Win Rate e Fator de Lucro isolados para cada ativo (ex: BTC, ETH).
- **Ranking de Performance**: Descubra rapidamente quais ativos trazem maior lucro ou geram perdas recorrentes.
- **Análise Long vs Short**: Identifique se a maior parte do lucro vem de operações Long ou Short.

### 💸 Dashboard de Taxas de Financiamento (Funding Fees)
Um painel abrangente que consolida dados de taxas de financiamento (funding rates) em tempo real e históricos da Bybit, Bitget e OKX (contratos perpétuos USDT-M e COIN-M):
- **Análise Multi-Período**: Analise taxas em múltiplos intervalos: Próxima Taxa, Última Taxa, Hoje, Mês Atual, Mês Passado, 3 Meses, 6 Meses e 1 Ano.
- **Pipeline de Agregação e Cache v10**: Utiliza o IndexedDB para armazenar sumários pré-calculados por mês calendário. Realiza sincronizações incrementais ultrarrápidas, com cobertura de até 400 dias (Bybit).
- **Indicadores Visuais**: Animações de atualização (flash) em tempo real e tooltips explicativos da direção do pagamento (Longs pagando Shorts ou vice-versa).
- *Nota sobre a OKX*: A API da OKX limita o histórico a ~3 meses, sendo automaticamente omitida das médias de 6M e 1Y para manter a integridade dos dados.

### 📜 Histórico de Transações Bybit (Transaction Log)
Uma ferramenta especializada para usuários da Bybit, desenvolvida para baixar, armazenar e analisar o histórico completo de transações brutas diretamente da corretora:
- **Sincronização Profunda**: Baixa histórico de liquidações, taxas de funding e taxas de trade, salvando tudo no IndexedDB local.
- **Cálculo de PnL Realizado**: Calcula ganhos e perdas reais com base na fórmula `cashFlow + funding - fee`.
- **Atualizações Incrementais**: Sincroniza apenas novos registros após o download inicial.

### ⚡ API Tester (Testador de Conexões e Endpoints)
Ferramenta para diagnóstico técnico e validação de conectividade com as corretoras:
- **Testes REST**: Dispare chamadas diretas autenticadas e públicas para verificar tempos de resposta (latência) e payloads brutos.
- **Diagnóstico de WebSocket**: Monitore o status do handshake e a recepção de mensagens em tempo real.

### 👁 Modo Privacidade (Privacy Mode)
Clique no **Ícone de Olho** no topo direito do menu lateral para ativar o ocultamento global de valores numéricos. Isso transformará números financeiros em máscaras `***`, permitindo gravações de tela e compartilhamento seguro.

---

## 8. Padronização de Contratos Inversos e Paginação

### Tratamento Unificado de Contratos Inversos (COIN-M vs USDT-M)
As corretoras reportam contratos perpétuos lineares (USDT-M) e inversos (COIN-M) de maneiras distintas:
- **Tamanho e Volume**: Para contratos lineares, a quantidade (`size`) representa o número de moedas e o valor nocional é `size * markPrice`. Para contratos inversos, o CPM converte e normaliza automaticamente o tamanho real em moeda e o valor nominal em USD utilizando as cotações oficiais e regras de contrato de cada exchange.
- **Preço de Entrada no Hedge**: Ao calcular a proteção em estratégias de hedge, o CPM utiliza o preço de entrada fixo (`entryPrice`) da posição short para não distorcer o valor protegido com a oscilação do mercado.

### Controles de Paginação Inteligente (v1.31.0)
As tabelas de Posições Abertas, Ordens Abertas, Histórico de Ordens e Histórico de Execuções contam com controles avançados de paginação:
- **Seleção de Itens por Página**: Escolha visualizar 10, 25, 50 ou 100 itens por página.
- **Navegação Fluida**: Indicadores claros da página atual e total de páginas com proteção contra limites fora de escala.

---

## 9. Exportação de Relatórios Operacionais

Deseja realizar auditorias externas ou arquivar seus relatórios fiscais? Acesse a aba **Reports** para exportar:
- **Formato PDF**: Gera um documento profissional estruturado de forma visual contendo seu balanço atual, principais posições fechadas e estatísticas agregadas.
- **Formato Excel (.xlsx) / CSV**: Planilhas completas com colunas separadas para símbolos, lados (buy/sell), volumes, preços de entrada/saída, taxas pagas e o PnL final detalhado.

---

## 10. Suporte a PWA (Instalar App)

O CPM é construído como um Progressive Web App (PWA). Você pode instalá-lo em seu Desktop ou dispositivo móvel para executá-lo como um aplicativo nativo autônomo. Para instalá-lo, procure o ícone de instalação na barra de endereços do seu navegador (Chrome/Edge) ou use a opção "Adicionar à Tela Inicial" no Safari iOS.

---

## 11. Solução de Problemas Comuns (FAQ)

### Minhas chaves de API não conectam. O que fazer?
1. Verifique se copiou a chave sem espaços extras no início ou fim.
2. Verifique se selecionou a corretora correta (as chaves da Bybit não funcionam na OKX).
3. Na **Bitget** e **OKX**, certifique-se de que inseriu a **Passphrase** exata que criou no site da corretora.
4. Certifique-se de que a sua chave possui permissões de **Leitura** ativas.

### Esqueci minha Senha Mestra. O que devo fazer?
Por questões de segurança zero-trust, a senha mestra não é recuperável em servidores. Caso a esqueça, você pode redefinir o aplicativo na tela de desbloqueio (Wipe Data), o que apagará as chaves criptografadas e permitirá reconfigurá-las do zero ou restaurar de um arquivo de backup previamente exportado.

### Posso usar o CPM no meu smartphone?
Sim! O design do CPM é totalmente responsivo e adapta todas as tabelas, barras de exposição e painéis em layouts de toque simplificados.

---

*Crypto Portfolio Manager — Conectividade Profissional, Segurança Absoluta.*
