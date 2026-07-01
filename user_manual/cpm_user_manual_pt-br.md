# 📘 Manual do Usuário - Crypto Portfolio Manager (CPM)

Bem-vindo ao **Crypto Portfolio Manager (CPM)**! Este terminal foi desenvolvido para consolidar e monitorar, em tempo real, seu desempenho operacional, saldos, posições ativas e histórico de ordens entre as corretoras **Bitget**, **Bybit** e **OKX**.

Nossa prioridade absoluta é a **segurança de nível zero-trust** e a **preservação de privacidade**, garantindo que seus dados e credenciais de API permaneçam sempre em seu controle local.

---

## 📌 Sumário
1. [Arquitetura de Segurança Zero-Trust](#1-arquitetura-de-segurança-zero-trust)
2. [Configuração Inicial e Chaves de API](#2-configuração-inicial-e-chaves-de-api)
3. [Modo Simulação (Mock Data)](#3-modo-simulação-mock-data)
4. [Análise de Desempenho em Tempo Real (WebSockets & Latência)](#4-análise-de-desempenho-em-tempo-real-websockets--latência)
5. [Terminal de Logs Integrado (Connection Logs)](#5-terminal-de-logs-integrado-connection-logs)
6. [Sincronização Avançada com Cache IndexedDB](#6-sincronização-avançada-com-cache-indexeddb)
7. [Guia de Telas e Navegação Diária](#7-guia-de-telas-e-navegação-diária)
8. [Exportação de Relatórios Operacionais](#8-exportação-de-relatórios-operacionais)
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
   - Os WebSockets reais são desconectados imediatamente.
   - O aplicativo carrega um banco de dados simulado contendo saldos multi-ativos, ordens abertas e posições históricas ricas em detalhes.
   - Um alerta visual amarelo **"Simulation Mode"** aparecerá no topo da tela.
   - Botões de sincronização manual de histórico serão desativados para evitar chamadas de API inválidas.

---

## 4. Análise de Desempenho em Tempo Real (WebSockets & Latência)

O aplicativo utiliza conexões bidirecionais de alta velocidade (WebSockets) diretamente do seu navegador para coletar cotações e alterações no saldo/posições.

No painel **API Keys**, você terá uma visão de telemetria refinada:
- **Sparklines de Latência**: Um gráfico em linha atualizado a cada poucos segundos que mede o tempo de resposta em milissegundos (ping) entre o seu computador e os servidores de cada corretora.
- **Throughput (Vazão)**: Medição em tempo real da quantidade de dados (em KB/s) que está sendo trafegada na sua conexão com o feed de dados das corretoras.

---

## 5. Terminal de Logs Integrado (Connection Logs)

Para que você possa acompanhar cada requisição, autenticação e evento de WebSocket, desenvolvemos um terminal de log profissional acoplado à página de credenciais:

1. Na página **API Keys**, deslize para a parte inferior para visualizar o terminal docked. Ele também está acessível através do menu lateral na aba **Connection Logs**.
2. **Máscara de Segredos (Zero-Leak)**: O terminal possui filtros inteligentes para garantir que suas chaves de API, Passphrases ou assinaturas criptográficas **nunca apareçam em texto puro nos logs**.
3. **Filtros por Categoria**:
   - `SYSTEM`: Inicialização de módulos e reconexões de rede.
   - `DATA`: Entrada de atualizações de saldo e feeds de preços.
   - `WARN` / `ERROR`: Alertas de conexão lenta, expiração de tokens ou erros nas credenciais de API.
4. **Busca Local por Texto**: Digite termos ou utilize expressões regulares (regex) na barra de busca para localizar eventos de ativos específicos.

---

## 6. Sincronização Avançada com Cache IndexedDB

Para evitar limites de requisições de API (*Rate Limiting*) das corretoras e carregamentos lentos, o CPM conta com um mecanismo sofisticado de **Cache Inteligente**:

- **IndexedDB**: Um banco de dados robusto embutido no seu navegador que armazena localmente o histórico de posições encerradas e ordens executadas.
- **Orquestrador SWR (Stale-While-Revalidate)**: Ao acessar as abas de histórico, o CPM renderiza instantaneamente os dados salvos em cache enquanto uma verificação em segundo plano atualiza novas transações.
- **Intervalo de Polling Personalizável**: Acesse **Settings** para configurar o intervalo em que o cache em segundo plano deve ser recarregado (padrão de 15 minutos).

---

## 7. Guia de Telas e Navegação Diária

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

### 📂 Closed Positions & Order History (Históricos)
- **Análise Estatística**: Exibe métricas de desempenho chave como **Win Rate %**, **Profit Factor**, Médias de Ganho/Perda e Maior Trade Executado.
- **Histórico de Ordens**: Tabela interativa com busca regex avançada local, permitindo expandir linhas para ver as taxas operacionais (fees) pagas à corretora.

### 👁 Modo Privacidade (Privacy Mode)
Clique no **Ícone de Olho** no topo direito do menu lateral para ativar o ocultamento global de valores numéricos. Isso transformará números financeiros em máscaras `***`, permitindo que você compartilhe capturas de tela ou faça transmissões ao vivo sem expor o tamanho do seu patrimônio.

---

## 8. Exportação de Relatórios Operacionais

Deseja realizar auditorias externas ou arquivar seus relatórios? Acesse a aba **Reports** para exportar:
- **Formato PDF**: Gera um documento profissional estruturado de forma visual contendo seu balanço atual, principais posições fechadas e estatísticas agregadas.
- **Formato Excel (.xlsx) / CSV**: Planilhas completas com colunas separadas para símbolos, lados (buy/sell), volumes, preços de entrada/saída, taxas pagas e o PnL final detalhado.

---

## 9. Solução de Problemas Comuns (FAQ)

### Minhas chaves de API não conectam. O que fazer?
1. Verifique se copiou a chave sem espaços extras no início ou fim.
2. Verifique se selecionou a corretora correta (as chaves da Bybit não funcionam na OKX).
3. Na **Bitget** e **OKX**, certifique-se de que inseriu a **Passphrase** exata que criou no site da corretora.
4. Certifique-se de que a sua chave possui permissões de **Leitura** ativas.

### A latência está muito alta. Isso afeta minha conta?
Não. A latência alta significa apenas que o feed de dados visualizados no terminal está ligeiramente atrasado em relação à corretora. Suas ordens e posições continuam operando de forma nativa e segura dentro do servidor da exchange.

### Posso usar o CPM no meu smartphone?
Sim! O design do CPM é totalmente responsivo e adapta todas as tabelas e painéis em layouts de toque simplificados.

---

*Crypto Portfolio Manager — Conectividade Profissional, Segurança Absoluta.*
