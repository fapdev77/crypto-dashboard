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
- ✅ **Gestão Avançada de Posições:** 
  - **Posições Abertas:** Monitoramento em tempo real com informações detalhadas como PnL Não Realizado, ROE, Margem, Preço de Liquidação. Inclui suporte para modos de visualização alternativos (**Detailed** e **Lite**) para adaptar a densidade da interface segundo a preferência do usuário.
  - **Posições Encerradas (Histórico):** Aba especializada para o histórico de trades via REST APIs para cada corretora (suportando bitget, bybit e okx). Inclui funcionalidade sofisticada de filtragem por alcance de tempo (1 Dia, 1 Semana, 1 Mês, 3 Meses e Datas Customizadas) validando e normalizando retornos e fusos para uma amostragem única de lucros consolidados.
- ✅ **Reports Dashboard:** Exportação consolidada de histórico em PDF, CSV e Excel com formatação rigorosa e cache incremental em memória.
- ✅ **Analytics Dashboard:** Extração de inteligência dos trades passados contendo:
  - **Métricas Avançadas:** *Win Rate*, *Profit Factor*, Taxas brutas e líquidas pagas.
  - **Seasonality (Sazonalidade):** Desempenho mapeado por dia da semana e horários da janela operacional (4 horas).
  - **External Flow:** Leitura nativa de *Bills* (Depósitos e Saques) para isolar o crescimento patrimonial *puramente operacional*.
  - **Milestone Matrix:** Acompanhamento da flutuação patrimonial em relação aos "brackets" de preços atingidos pelo Bitcoin.
- ✅ **Modo de Desenvolvimento e Testes (Mock Data):** Por meio do novo menu de `Settings`, desenvolvedores ou usuários testando o produto podem ativar de forma nativa a o preenchimento da UI com Dados Simulados (Mockados). O ativar da opção encerra programaticamente qualquer streaming real e insere PNL, saldos, bills (depósitos) e tabelas de histórico fictícias para debug de componentes de UI. Ao desabilitar, a recuperação do Real-Time é feita instantaneamente.
- ✅ **Refinamentos na Tabela de Balances:** Visualização por colunas incluindo Asset (Moedas), Labels e Accounts e suas designações para a respectiva infraestrutura, Exigência para saldos base em unificados e quantias decimais flexíveis. Além disso, as colunas contam com sorting interativo e barra multi-buscas (Filtros locais via Regex).
- ✅ **Layout Dashboard Masonry:** O painel de saldos foi refinado para utilizar um formato responsivo em *Masonry Layout* utilizando CSS Native Columns (1, 2, ou até 3 colunas baseadas na largura da tela), garantindo que a expansão de saldos não afete negativamente as corretoras adjacentes.
- ✅ **Sidebar Inteligente e Sparklines Estilizados:** A barra de menus (Sidebar) foi atualizada para permitir o recurso "Collapsible", oferecendo uma área expansível ou oculta que prioriza o espaço utilitário da tela. Sparklines de PnL Diário foram introduzidos nativamente na lista de subcontas nos modais das corretoras.
- ✅ **Ticker de Mercado Dinâmico (Real-Time):** Adicionado ao cabeçalho global do sistema um mostrador deslizante (Marquee Carousel) interativo que espelha os ativos das posições em aberto, revelando a variação base e preço das moedas operadas em tempo real.
- ✅ **Refinamentos na Interface (UI/UX):** Ocultamento inteligente de scrollbars verticais e personalização das barras horizontais implementando o estilo responsivo nativo Dark Mode (`index.css`), o que traz uma imersão muito mais elegante enquanto se monitora ativamente as tabelas do Dashboard.
- ✅ **Carga REST híbrida introduzida para Bybit:** Websockets limitavam listagens estáticas ativas, a API resolve com fetchs silenciosos aos Endpoints unificados `v5/account/wallet-balance` e posições pre-cached.
- ✅ **Ocultamento de PNL de Posições Nulas:** Só aparecem recursos em execução com size > 0 .

### Manutenção - Adicionando Nova Corretora
Caso deseja escalonar o dashboard: 
1. Crie os arquivos `RestAdapter`, `HistoryAdapter` e `WsAdapter` na pasta `src/services/adapters/[nova_corretora]`.
2. Inclua o nome referenciado no Union type `Exchange` de lib `store/apiKeysStore.ts` e propague sua tipagem via React Forms da modal de Configurações `components/ApiConfigModal.tsx`.
3. Direcione a lógica central de Websockets da nova plataforma nos hooks (`useMultiExchangeWS.ts`) e instancie-a nas fábricas `PositionHistoryService` e `BillsHistoryService`.

## 📚 Documentação para Desenvolvedores e Engenharia de IA
Este projeto adota o modelo **Spec-Driven Development (SDD)** e está preparado para recriação ou refatoração por IAs Generativas (ex: Antigravity, Claude, ChatGPT). 

Todos os documentos e diagramas arquiteturais estão disponíveis no diretório `/specs`:
- [PRD (Desenvolvimento de Produto)](./specs/PRD.md): Regras de negócio originais.
- [Arquitetura e Fluxo de Dados](./specs/ARCHITECTURE.md): Diagrama estático e funcionamento híbrido Proxy-Frontend.
- [Prompt Engineering](./specs/PROMPT_ENGINEERING.md): O prompt base ideal para alimentar uma IA para recriar ou entender todo o escopo do projeto do zero.

(Para documentação legada de requisitos, consulte também [`requirements.md`](./requirements.md) na raiz do projeto).
