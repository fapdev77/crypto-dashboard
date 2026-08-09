# 📘 Manual do Usuário - Crypto Portfolio Manager (CPM)

Bem-vindo ao **Crypto Portfolio Manager (CPM)**! Este terminal foi desenvolvido para consolidar e monitorar, em tempo real, seu desempenho operacional, saldos, posições ativas e histórico de ordens entre as corretoras **Bitget**, **Bybit** e **OKX**.

Nossa prioridade absoluta é a **segurança de nível zero-trust** e a **preservação de privacidade**, garantindo que seus dados e credenciais de API permaneçam sempre em seu controle local.

---

## 📌 Sumário

1. [Arquitetura de Segurança Zero-Trust](#1-arquitetura-de-segurança-zero-trust)
2. [Configuração Inicial e Chaves de API](#2-configuração-inicial-e-chaves-de-api)
3. [Modo Simulação (Mock Data)](#3-modo-simulação-mock-data)
4. [Terminal de Logs Integrado (Connection Logs)](#4-terminal-de-logs-integrado-connection-logs)
5. [Sincronização e Configurações de Cache (Settings)](#5-sincronização-e-configurações-de-cache-settings)
6. [Guia de Telas e Navegação Diária](#6-guia-de-telas-e-navegação-diária)
7. [Exportação de Relatórios Operacionais](#7-exportação-de-relatórios-operacionais)
8. [Suporte a PWA (Instalar App)](#8-suporte-a-pwa-instalar-app)
9. [Solução de Problemas Comuns (FAQ)](#9-solução-de-problemas-comuns-faq)

---

## 1. Arquitetura de Segurança Zero-Trust

O CPM foi projetado sob um paradigma rígido de segurança descentralizada:
- **Sem Servidor de Terceiros**: Não possuímos bancos de dados na nuvem que armazenam suas credenciais. Toda a comunicação ocorre de forma direta do seu navegador para os servidores das exchanges.
- **Armazenamento Seguro Local**: Suas chaves de API são armazenadas exclusivamente no `localStorage` do seu navegador de forma criptografada temporária em memória dinâmica enquanto a sessão estiver ativa.
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
4. **Verifique o Status**: A conexão será iniciada. Um indicador visual exibirá o status em tempo real (ex: Verde para Conectado, Vermelho para Erros com diagnóstico preciso).

---

## 3. Modo Simulação (Mock Data)

Se você deseja experimentar a interface e as ferramentas analíticas sem inserir suas chaves reais de API, o CPM oferece um **Modo Simulação** robusto:

1. Acesse a aba **Settings** no menu lateral.
2. Ative a opção **Use Mock Data (Simulation Mode)**.
3. **O que acontece ao ativar**:
   - A sincronização automática com as APIs reais é pausada imediatamente.
   - O aplicativo carrega um banco de dados simulado contendo saldos multi-ativos, ordens abertas e posições históricas ricas em detalhes.
   - Um alerta visual amarelo **"Simulation Mode"** aparecerá no topo da tela.
   - Botões de sincronização manual de histórico serão desativados para evitar chamadas de API inválidas.

---
## 4. Terminal de Logs Integrado (Connection Logs)

Para que você possa acompanhar cada requisição, autenticação e evento de comunicação REST, desenvolvemos um terminal de log profissional em uma página dedicada:

1. **Acesso Dedicado**: Acesse a aba **Connection Logs** diretamente pelo menu lateral para visualizar o terminal.
2. **Máscara de Segredos (Zero-Leak)**: O terminal possui filtros inteligentes para garantir que suas chaves de API, Passphrases ou assinaturas criptográficas **nunca apareçam em texto puro nos logs**.
3. **Filtros por Categoria**: 
   - `SYSTEM`: Inicialização de módulos e reconexões de rede.
   - `DATA`: Entrada de atualizações de saldo e feeds de preços.
   - `WARN` / `ERROR`: Alertas de conexão lenta, expiração de tokens ou erros nas credenciais de API.
4. **Busca Local por Texto**: Digite termos ou utilize expressões regulares (regex) na barra de busca para localizar eventos de ativos específicos.

---
## 5. Sincronização e Configurações de Cache (Settings)

Para garantir um carregamento ultrarrápido das suas informações e evitar que as corretoras bloqueiem o acesso (rate limiting), o aplicativo salva seu histórico de posições, ordens e taxas de financiamento no seu navegador (Cache local).

Através da tela **Settings** no menu lateral, você pode controlar o funcionamento do aplicativo:
- **Intervalos de Atualização (Polling)**: Ajuste com que frequência o sistema busca novas ordens, posições ou taxas de financiamento. Isso é útil caso você queira atualizações mais rápidas ou prefira reduzir o consumo de internet.
- **Limpeza de Cache (Clear Data)**: Caso você sinta que o aplicativo está exibindo dados desatualizados, ordens travadas ou inconsistências após operar diretamente na corretora, você pode usar os botões de limpeza (ex: *Clear Orders Cache*, *Clear Funding Cache*). Isso forçará o aplicativo a baixar todo o seu histórico novamente na próxima sincronização.
- **Wipe All Local Client Data (Apagar Tudo)**: Na Danger Zone, você pode redefinir o aplicativo para as configurações de fábrica. Isso apagará todas as chaves de API armazenadas, caches históricos e preferências do usuário do seu navegador, retornando o aplicativo ao seu estado limpo original.
- **Simulation Mode**: Ative ou desative o modo de simulação a qualquer momento para testar a interface com dados fictícios.

---
## 6. Guia de Telas e Navegação Diária

### 🏠 Dashboard Principal
Seu painel analítico central, composto por uma estrutura elegante de cartões:
- **Balanço Consolidado**: Soma dos saldos de todas as carteiras e subcontas conectadas.
- **Alocação por Corretora**: Gráfico em formato de Donut mapeando sua distribuição de capital e risco de custódia.
- **Treemap de Ativos**: Distribuição visual dos seus criptoativos cross-exchange por tamanho de capital.
- **Capital Protection & Hedge**: Painel dedicado a apontar desequilíbrios entre posições Long e Short ativas para evitar liquidações em cascata.

### 💼 Open Positions (Posições Ativas)
Monitoramento em tempo real de suas posições ativas de derivativos (Futuros):
- **ROE% e PnL não realizado**: Indicadores de lucratividade ajustados pelo preço de marcação em tempo real.
- **Preço de Liquidação e Margem**: Alertas visuais mudam de cor conforme a posição se aproxima do preço de liquidação.
- **Coin Icon Auto-Fallback**: Componente unificado que categoriza e renderiza o logo correto de cada criptoativo com fallbacks dinâmicos.

### 📂 Closed Positions (Histórico de Posições)
- **Análise Estatística**: Exibe métricas de desempenho chave como **Win Rate %**, **Profit Factor**, Médias de Ganho/Perda e Maior Trade Executado.
- **Auditoria de PnL**: Visualize o PnL final consolidado por posição, tempo em que a posição ficou aberta e taxa de ROE%.

### 📝 Order Reports (Ordens Abertas e Histórico de Ordens)
- **Open Orders**: Monitore todas as suas ordens pendentes (Limit, Stop Loss, Take Profit) através de uma tabela consolidada, visualizando o status atual, quantidades e gatilhos de preço em tempo real.
- **Order History**: Tabela interativa com busca regex avançada local para todas as ordens já preenchidas ou canceladas, permitindo expandir linhas para ver detalhes de execução.

### 🔄 Trade History (Histórico de Execuções)
Uma visualização detalhada de todas as execuções de ordens e trades preenchidos nas corretoras.
- **Histórico Completo**: Acompanhe o preço exato de execução, quantidade (size), lado (Buy/Sell) e o papel (Taker/Maker) em cada transação.
- **Auditoria de Taxas**: Verifique exatamente quanto você pagou ou recebeu de taxa de execução (fees) por trade, com destaque para a moeda utilizada no pagamento.
- **Busca e Filtros**: Utilize a barra de busca para encontrar rapidamente os trades de um símbolo específico ou refine por corretora.

### 📊 PnL by Symbol (Lucros e Perdas por Símbolo)
Um relatório gerencial para analisar a performance individual de cada ativo operado.
- **Métricas Agregadas**: Visualize o Total de Ganhos, Total de Perdas, PnL Líquido (Net PnL), Win Rate e Fator de Lucro especificamente isolados para um ativo (ex: BTC, ETH).
- **Ranking de Performance**: Descubra rapidamente quais ativos lhe dão mais lucro e quais estão gerando perdas consistentes, ordenando a tabela pelas colunas desejadas.
- **Análise Profunda**: Identifique se a maioria do seu resultado positivo em um ativo vem de operações Long ou Short, otimizando suas estratégias.

### 💸 Dashboard de Taxas de Financiamento (Funding Fees)
Um painel abrangente que consolida dados de taxas de financiamento (funding rates) em tempo real e históricos da Bybit, Bitget e OKX (contratos perpétuos USDT-M e COIN-M).
- **Análise Multi-Período**: Analise as taxas em diferentes intervalos: Próxima Taxa, Última Taxa, Hoje, Mês Atual, Mês Passado, 3 Meses, 6 Meses e 1 Ano.
- **Cache Inteligente**: Utiliza o IndexedDB para armazenar o histórico de taxas. Após a sincronização inicial completa (~400 dias), o aplicativo realiza atualizações incrementais ultrarrápidas, baixando apenas os novos registros.
- **Indicadores Visuais**: Animações (flash) ao atualizar taxas em tempo real e tooltips explicativos informando a direção do pagamento (ex: Longs pagando Shorts).
- *Nota sobre a OKX*: A API da OKX limita o histórico de dados a aproximadamente 3 meses. Portanto, a OKX é excluída das médias de 6 Meses e 1 Ano para evitar distorções no mercado.

### 📜 Histórico de Transações Bybit (Transaction Log)
Uma ferramenta especializada para usuários da Bybit, desenvolvida para baixar, armazenar e analisar o histórico completo de transações brutas diretamente da corretora.
- **Sincronização Profunda**: Baixa todo o seu histórico de liquidações, taxas de financiamento pagas/recebidas e taxas de trade, salvando tudo no cache local (IndexedDB).
- **Cálculo de PnL Realizado**: Calcula com precisão os ganhos e perdas realizados com base no fluxo de caixa (cash flow), taxas de financiamento e taxas de trade.
- **Atualizações Incrementais**: Realiza sincronizações incrementais inteligentes após o download inicial, mantendo seus dados atualizados com o mínimo consumo de API.

### 👁 Modo Privacidade (Privacy Mode)
Clique no **Ícone de Olho** no topo direito do menu lateral para ativar o ocultamento global de valores numéricos. Isso transformará números financeiros em máscaras `***`, permitindo que você compartilhe capturas de tela ou faça transmissões ao vivo sem expor o tamanho do seu patrimônio.

---

## 7. Exportação de Relatórios Operacionais

Deseja realizar auditorias externas ou arquivar seus relatórios? Acesse a aba **Reports** para exportar:
- **Formato PDF**: Gera um documento profissional estruturado de forma visual contendo seu balanço atual, principais posições fechadas e estatísticas agregadas.
- **Formato Excel (.xlsx) / CSV**: Planilhas completas com colunas separadas para símbolos, lados (buy/sell), volumes, preços de entrada/saída, taxas pagas e o PnL final detalhado.

---

## 8. Suporte a PWA (Instalar App)

O CPM é construído como um Progressive Web App (PWA). Você pode instalá-lo em seu Desktop ou dispositivo móvel para executá-lo como um aplicativo nativo autônomo. Para instalá-lo, procure o ícone de instalação na barra de endereços do seu navegador (Chrome/Edge) ou use a opção "Adicionar à Tela Inicial" no Safari iOS.

---

## 9. Solução de Problemas Comuns (FAQ)

### Minhas chaves de API não conectam. O que fazer?
1. Verifique se copiou a chave sem espaços extras no início ou fim.
2. Verifique se selecionou a corretora correta (as chaves da Bybit não funcionam na OKX).
3. Na **Bitget** e **OKX**, certifique-se de que inseriu a **Passphrase** exata que criou no site da corretora.
4. Certifique-se de que a sua chave possui permissões de **Leitura** ativas.

### Posso usar o CPM no meu smartphone?
Sim! O design do CPM é totalmente responsivo e adapta todas as tabelas e painéis em layouts de toque simplificados.

---

*Crypto Portfolio Manager — Conectividade Profissional, Segurança Absoluta.*
