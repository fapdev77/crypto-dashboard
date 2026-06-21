# Crypto Portfolio Manager: Multi-Exchange

Um gerenciador e painel unificado avançado para consolidar dados (carteira, saldos e posições) de forma unificada e em tempo real. Atualmente suporta Bitget, OKX e Bybit.

## 🚀 Visão Geral e Arquitetura

O projeto foi construído com a premissa de **Zero Trust Security** e eficiência operacional. Nenhuma credencial de API trafega livremente para servidores de terceiros não autorizados ou é armazenada em banco de dados centralizado. Todas as chaves são armazenadas exclusivamente de forma local no navegador do usuário (`localStorage`).

A arquitetura resolve o problema tradicional de CORS e as restrições arquiteturais para clientes puros (browsers) da seguinte forma:

1. **WebSockets (Real-time):** A conexão é feita de forma nativa e direta pelo navegador às corretoras para obter atualizações em alta frequência. A autenticação do WebSocket é efetuada no client-side via Web Crypto API nativa. O dashboard possui engine de auto reconexão e gerencia os "Heartbeats" (Ping/Pong) de cada Exchange para manter as conexões de streaming vivas.
2. **REST API via Local Proxy:** Como navegadores encaram o bloqueio rigoroso do CORS (Cross-Origin Resource Sharing) ao fazer GET/POST para endpoints da API V5/V2 das corretoras, empregamos um Proxy local reverso e seguro construído com Node.js e Express (`server.ts`). O Frontend cuida de toda a criptografia na ponta do usuário, assinando as requisições gerando os cabeçalhos (`headers`) necessários. O Proxy então atua de forma inerte e "burra", apenas recebendo os cabeçalhos já verificados e as URLs destino, repassando o payload real sem adulterar assinaturas ou armazenar logs. 
3. **Camada de Normalização (Adapters):** Todos os dados recebidos via REST e WebSocket não são repassados isoladamente à UI. Eles encontram primeiramente um conjunto modular de adaptadores `src/services/adapters/[exchange]`, processando "Raw API Responses" oriundas da OKX, Bitget e Bybit. Isso obedece rigorosamente ao **Single Responsibility Principle (SRP)** e ao padrão **Strategy**, delegando a geração de headers e normalização para os próprios adapters, extinguindo arquivos "God Object" de requisição.

   *Observação:* Para casos específicos como **Bybit**, onde o WebSocket usualmente retorna apenas deltas e atualizações, implementamos uma carga síncrona prévia via REST (também utilizando o Proxy) para a população imediata e coerente dos estoques e posições.

## ⚙️ Tecnologias Utilizadas (A Stack)
O sistema é inteiramente fundamentado no ecossistema de TypeScript moderno:
- **Frontend / Interface**: React 19, TypeScript, **Vite**, **Tailwind CSS v4**. Interface de usuário amigável equipada com **Lucide React** para ícones otimizados.
- **Gerenciamento de Estado**: **Zustand**. Utilizamos o `useDashboardStore` para o gerenciamento ultrarrápido dos objetos recebidos por WebSockets e o `useApiKeysStore` para a persistência e ciclo de vida criptografado das chaves de API locais.
- **Tabelas Analíticas:** Visualização rica com ordenação multidirecional de resultados e sistemas de busca em tempo-real embutidos nas Views (filtros multicritério por ativo, nome ou corretora).
- **Backend / Proxy de Hospedagem**: Servidor minimalista escalável fundado no Node.js com Express e capacidades de roteamento local Vite injetadas para o modo de desenvolvimento. Executado via `tsx`.
- **Criptografia SecOps**: A espinha dorsal para assinatura de rotas REST, payloads ISO Timestamp (OKX), Nano Time (Bitget) e Hex Signatures (Bybit). Todos utilizando a nativa Web Crypto API (`window.crypto.subtle`).

## 📦 Configuração Inicial e Execução

### Pré-requisitos
- Node.js (versão 18 ou 20+, a Engine LTS mais atual é recomendada).
- Gerenciador de Pacotes (`npm` incluído com o Node).

### 1. Clonagem e Instalação de Dependências
Clone ou realize o download direto do projeto no seu ambiente. Na raiz do projeto, instale o cache oficial dos módulos em execução profunda:
```bash
npm install
```

### 2. Rodando o Ambiente (Modo Desenvolvimento)
Esta configuração irá ativar uma dupla infraestrutura unificada: O Node server (Proxy de APIs) atuará e delegará o serviço dinâmico para a compilação Hot Module Replacement (HMR) integrada do Vite, gerando acessos locais via Porta Padrão `3000`:
```bash
npm run dev
```

### 3. Deploy e Execução em Produção
Seu aplicativo pode rodar confiavelmente em serviços de Nuvem Serverless como Google Cloud Run, Railway ou instâncias Dockerizadas em provedores VPS (como AWS EC2, Droplets DigitalOcean, Hostinger).
```bash
# 1. Empacotar, compilar otimizações de árvore e purgar o CSS do Frontend
npm run build

# 2. Iniciar o Server com as capacidades unificadas para Distribuição Estática no ambiente gerado.
npm start # Executa tsx server.ts com as flags NODE_ENV=production necessárias.
```
*Note que pelo design reverso da `server.ts` ao rodar fora do Node_Env dev, ele atua ativamente lendo da pasta compilada de produção local (`/dist`)*.

Atente-se de assegurar ou configurar o provisionamento HTTPS em Produção se for acoplar em Domínios customizados — navegadores modernos como o Chrome bloqueiam a API WebCrypto caso a hospedagem use HTTP (não segura), exceto em Localhost.

## 🧰 Guia Prático - Configurando as Corretores no Client Local

1. Com o app aberto (ex.: `http://localhost:3000`), clique na pílula lateral com um símbolo de engrenagem **⚙️ API Keys**.
2. Clique no Botão "+ Add Exchange".
3. Aparecerá a palheta de corretoras: Forneça um rótulo local que preferir, em seguida, as informações oficiais provenientes da sua Plataforma Exchange correspondente para o usuário atual da aba. (Necessário preenchimento da *Passphrase* em Bitget e OKX).
4. Assim que confirmado o Modal, os algoritmos do sistema efetuarão validações imediatas e pingarão WebSockets seguros. Indicadores (Ponto vermelho/verde) em tempo real serão exibidos confirmando que tudo está síncrono.
5. Volte para a rota principal "Dashboard", agora deverá ver seus saldos totais atualizando globalmente.

## 🛠 Features e UI/UX Recentes
- ✅ **Múltiplos Formatos de Contratos e Exatidão de Precisão:** 
  - **Identificação Dinâmica de Pares:** O sistema distingue ativamente pares Fiats/Stablecoins (Ex: BTCUSDT, EURUSD) de Contratos Inversos Puros ("Inverse Contracts" como BTCUSD) em toda a arquitetura UI e de cálculo em background.
  - **Tamanho e Valores de Posição:** Foram realizadas estabilizações robustas do cálculo de tamanho em criptomoedas (Base Coin Size) versus Volume Financeiro em Dólar (Notional USD) para ativos peculiares em *Bybit* (Contratos onde "Size" é enviado como USD) e em *OKX* onde o *Size* costuma vir como número de Contratos (Contracts). As inferências ocorrem retroativamente calculando margens puras em `Close/Entry Prices` em registros históricos PnL.
  - **Formatadores Globais Inteligentes:** Funções utilitárias customizadas (`formatCrypto`, `formatPrice`, `formatValue`) que reagem ativamente ao tipo e à magnitude do valor (0.0000 -> 8 casas, enquanto $10k -> 2 casas) sem intervenção manual.
  - **Posições Abertas:** Monitoramento em tempo real com informações detalhadas como PnL Não Realizado, ROE, Margem, Preço de Liquidação. Inclui suporte para modos de visualização alternativos (**Detailed** e **Lite**) para adaptar a densidade da interface segundo a preferência do usuário.
  - **Capital Protection (Hedge) em Contratos Inversos:** Implementação nativa de cálculos de Exposição e Proteção de capital para posições de Contratos Inversos Puros (ex: BTCUSD). O sistema infere ativamente as estatísticas de Hedge dinamicamente (progress bar de Hedge %) contra o volume total da carteira spot pareando Short e Longs.
  - **Posições Encerradas (Histórico) e IndexedDB Cache:** Aba especializada para o histórico de trades via REST APIs para cada corretora (suportando Bitget, Bybit e OKX). Para mitigar restrições de chamadas de API (Rate Limits) das corretoras e permitir acesso ágil ao longo histórico, o Dashboard implementa um sistema agressivo e robusto de **Local Caching via IndexedDB** (`idb`). Com ele, o sistema garante:
    - Sincronização e Download progressivo em segundo plano (Background Polling configurável de 5 a 60 minutos).
    - Opções avançadas via modal de `Settings` para purgar (Clear Local Cache), re-sincronizar (Force Sync) de forma indolor o histórico diretamente das exchanges, emitindo notificações instantâneas de sucesso/erro via **Toast UI**.
    - Filtros ricos e avançados que realizam varreduras de dados via banco in-memory, possibilitando visualização em recortes temporais predefinidos ou datas customizadas sem delays de requisições externas.
- ✅ **Classificador Dinâmico Global de Ativos e Identidade Visual Automatizada (Logo.dev):**
  - **Identificação Multi-Corretora (AssetClassifierAggregator):** Implementação de um orquestrador centralizado que classifica a categoria nativa de um ativo (como `STOCK` ou `CRYPTO`) utilizando listagens e dados provenientes diretamente das APIs das Exchanges integradas (como a OKX via `/api/v5/public/instruments?instType=SWAP`). Operações de pareamento de sintaxe foram implementadas para ativos tradicionais, isolando o base asset (como `NVDA-USDT` p/ `NVDA`).
  - **Hierarquia de Cache em 4 Níveis:** Redução drástica da latência e sobrecarga da API das exchanges ao priorizar 1) Cache Em-Memória (Local Cache); 2) Bancos Locais IndexedDB Persistentes (`historyCache`); 3) Requisições ao Vivo em série (OKX -> Bybit -> Bitget); 4) Padrão de salvamento.
  - **Integração Robusta de Logotipos (Logo.dev) e Badges Visuais:** Para refletir em interfaces visualmente coerentes as classificações, os ícones implementados no componente nativo `CoinIcon` adotam inteligência condicional de fallbacks da `Logo.dev` e utilizam o parâmetro `fallback=404`. Diferentes origens de mercado roteam chamadas transparentemente, atuando primariamente no endpoint `/crypto/`, caindo graciosamente para o `/ticker/` e endpoint `/name/` antes de utilizar fallback nativo, preenchendo todos os gaps visuais em painéis de *Open Positions*, *Histórico* e *Dashboards*. Adicionalmente, indicadores tipo "Badge" mostram no card de posições qual sua categoria na tela em tempo real.
- ✅ **Insights & Analytics Dashboard:** Extração de inteligência dos trades passados contendo:
  - **Métricas Avançadas:** *Win Rate*, *Profit Factor*, Taxas brutas e líquidas pagas.
  - **Sazonalidade (Seasonality):** Desempenho mapeado por dia da semana e horários da janela operacional (4 horas).
  - **External Flow:** Leitura nativa de *Bills* (Depósitos e Saques) para isolar o crescimento patrimonial *puramente operacional*.
  - **Milestone Matrix:** Acompanhamento da flutuação patrimonial em relação aos "brackets" de preços atingidos pelo Bitcoin.
  - **PnL By Symbol (Distribuição de Lucros/Prejuízos por Moeda):** Tabela e Gráfico detalhado categorizando o PnL fechado associado aos ativos da carteira com precisão nas particularidades de alavancagem de cada corretora (USDT-M, USDC-M e Coin-Margined na Bitget; Inverse/Linear na Bybit; e SWAP na OKX), com um filtro customizável para cada tipo de Instrumento transacionado.
- ✅ **Modo de Desenvolvimento e Testes (Mock Data):** Por meio do novo menu de `Settings`, desenvolvedores ou usuários testando o produto podem ativar de forma nativa a o preenchimento da UI com Dados Simulados (Mockados). O ativar da opção encerra programaticamente qualquer streaming real e insere PNL, saldos, bills (depósitos) e tabelas de histórico fictícias para debug de componentes de UI. Ao desabilitar, a recuperação do Real-Time é feita instantaneamente.
- ✅ **Refinamentos na Tabela de Balances:** Visualização por colunas incluindo Asset (Moedas), Labels e Accounts e suas designações para a respectiva infraestrutura, Exigência para saldos base em unificados e quantias decimais flexíveis. Além disso, as colunas contam com sorting interativo e barra multi-buscas (Filtros locais via Regex).
- ✅ **Monitoramento de Telemetria e Latência:** Um painel ativo de *Connection Health* integrado na aba global (Status Bar) que analisa ativamente o Round-Trip Time (RTT/Latency) através de rotinas Ping/Pong dos WebSockets, relatando o throughput global de rede consumido (em KB/s) pelos streams e o resumo de conexões ativas simultâneas da aplicação.
- ✅ **Layout Dashboard Masonry:** O painel de saldos foi refinado para utilizar um formato responsivo em *Masonry Layout* utilizando CSS Native Columns (1, 2, ou até 3 colunas baseadas na largura da tela), garantindo que a expansão de saldos não afete negativamente as corretoras adjacentes.
- ✅ **Sidebar Inteligente e Sparklines Estilizados:** A barra de menus (Sidebar) foi atualizada para permitir o recurso "Collapsible", oferecendo uma área expansível ou oculta que prioriza o espaço utilitário da tela. Sparklines de PnL Diário foram introduzidos nativamente na lista de subcontas nos modais das corretoras.
- ✅ **Ticker de Mercado Dinâmico (Real-Time):** Adicionado ao cabeçalho global do sistema um mostrador deslizante (Marquee Carousel) interativo que espelha os ativos das posições em aberto, revelando a variação base e preço das moedas operadas em tempo real.
- ✅ **Refinamentos na Interface (UI/UX) e Tooltips Padronizados:** Ocultamento inteligente de scrollbars verticais e personalização das barras horizontais implementando o estilo responsivo nativo Dark Mode (`index.css`), o que traz uma imersão muito mais elegante. Além disso, criamos um sistema de tooltip reaproveitável, ancorado no Radix UI e lucide-react para garantir informações concisas, suspensas e formatadas de modo padronizado em todo o aplicativo sem sujar a tela principal.
- ✅ **Bootloading REST Paralelo (ExchangeAggregator):** Websockets limitavam listagens estáticas ativas (snapshots base de portfólio), o dashboard agora orquestra uma carga paralela híbrida assíncrona ao iniciar a aplicação buscando simultaneamente balanços e posições (`v5/account/wallet-balance`, `api/v2/spot/account/assets`, etc.) para **todas** as corretoras integradas.
- ✅ **Ocultamento de PNL de Posições Nulas:** Só aparecem recursos em execução com size > 0 .

### Manutenção - Adicionando Nova Corretora
Caso deseja escalonar o dashboard: 
1. Crie um único arquivo adapter (ex: `NovaCorretoraAdapter.ts`) na pasta `src/services/adapters/` estendendo a interface comum `IExchangeAdapter`. Ele deve agrupar métodos de `getBalance`, `getOpenPositions`, polling de histórico REST, fetch de bills e o parsing global do WebSocket (limitado a < 400 linhas para preservar o contexto e a regra do *Clean Code*).
2. Inclua o nome referenciado no Union type `ExchangeName` do tipo de configurações (em `types.ts` ou `store/apiKeysStore.ts`) e propague sua tipagem via React Forms no modal de Configurações `components/ApiConfigModal.tsx`.
3. Direcione a inicialização na classe `ExchangeAggregator.ts`, no hook de websockets (`useMultiExchangeWS.ts`) e instancie-a nas fábricas `PositionHistoryService` e `BillsHistoryService`.

## 📚 Documentação para Desenvolvedores e Engenharia de IA
Este projeto adota o modelo **Spec-Driven Development (SDD)** e está preparado para recriação ou refatoração por IAs Generativas (ex: Antigravity, Claude, ChatGPT). 

Todos os documentos e diagramas arquiteturais estão disponíveis no diretório `/specs`:
- [PRD (Desenvolvimento de Produto)](./specs/PRD.md): Regras de negócio originais.
- [Arquitetura e Fluxo de Dados](./specs/ARCHITECTURE.md): Diagrama estático e funcionamento híbrido Proxy-Frontend.
- [Prompt Engineering](./specs/PROMPT_ENGINEERING.md): O prompt base ideal para alimentar uma IA para recriar ou entender todo o escopo do projeto do zero.

(Para documentação legada de requisitos, consulte também [`requirements.md`](./requirements.md) na raiz do projeto).
