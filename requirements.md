# Documento de Requisitos e Análise Técnica (SPDD)

## 1. Visão Geral
Sistema de Dashboard Crypto Multi-Exchange operando em tempo real (WebSockets) com consolidação de carteira e posições das corretoras **Bitget**, **OKX** e **Bybit**. Focado em alta segurança "Zero-Trust", onde os segredos (API Secrets) residem exclusivamente no lado do cliente.

## 2. Análise de Conflitos (CORS) e Limitações de API

Durante a arquitetura do sistema, o seguinte bloqueio técnico foi identificado em relação as três corretoras citadas:
- **WebSockets Privados:** A maioria das exchanges (incluindo as três) permite conexões WSS nativas do navegador sem enforcement estrito de CORS, desde que a autenticação (login message) seja estruturada corretamente.
- **REST APIs Privadas:** Requisições para endpoints REST (ex: Histórico de posições nas últimas 24h) **sofrem bloqueio de CORS (Cross-Origin Resource Sharing)** se feitas diretamente do navegador (browser).

### Resolução de Segurança para o CORS
Como o requisito constitucional #2 dita que as credenciais *NUNCA* podem ser enviadas para um servidor centralizado, empregaremos a seguinte estratégia arquitetônica:
1. **Assinatura Client-Side (Frontend):** O navegador (React) acessa o `localStorage`, pega as chaves, coleta o Timestamp, gera a string primária e executa a criptografia HMAC-SHA256.
2. **Distribuição dos Headers:** O Frontend empacota a assinatura final em Headers HTTP (ex: `OK-ACCESS-SIGN`) sem expor a `SECRET-KEY` bruta.
3. **Proxy "Burro" (Backend Opcional Local):** Criaremos um endpoint simples em Node.js (`/api/proxy`) que atuará apenas como repassador. O Frontend envia os headers assinados e a URL de destino para o Proxy, que fará a chamada de rede final para contornar o CORS. Dessa forma, a chave secreta nunca transita na rede.

## 3. Especificações Técnicas e de UX/UI
- **Stack:** React 19, Vite, TypeScript, Tailwind CSS v4, Zustand (Gerenciamento de Estado), Lucide React.
- **Design System:** Baseado em "Technical Dashboard", utilizando esquema de cores Dark Mode obrigatório, tipografia monospace para dados numéricos (ex `JetBrains Mono`) e fontes sem serifa legíveis (`Inter`) para a interface, priorizando densidade de dados e clareza.
- **Sincronia de Tempo:** As assinaturas HMAC exigem precisão de timestamp. Implementaremos um offset de tempo caso a hora local do usuário esteja dessincronizada com os servidores das corretoras.

## 4. Estrutura das Demandas Concluídas
- **Tarefa 1: Setup e UI Base:** Configuração de UI, layouts Dark Mode e persistência de `localStorage` para as chaves (sem expor para rede).
- **Tarefa 2: Módulo de Assinatura e Criptografia:** Helpers client-side para HMAC-SHA256 e padronização dos conectores REST via Proxy local.
- **Tarefa 3: Motor de WebSocket Privado:** Gerenciamento dos WebSockets simultâneos (Bitget, OKX, Bybit), subscrições, pings/heartbeats.
- **Tarefa 4: Componentes da Dashboard e Mock Data:** Integração dos cálculos (Total Equity, Unrealized PnL), modos de exibição "Lite" e "Detailed", tabelas de saldo interativas e alternância de Dados Simulados (Mocking) para desenvolvimento/testes desassociados.
- **Tarefa 5: Refinamento e Histórico:** Módulo REST para histórico (Posições Fechadas) com filtros granulares temporais, Status de conexão global contínuo e ocultação de elementos sem saldos/posições.
