# Multi-Exchange Crypto Dashboard

Um terminal de operações multi-exchange para consolidar dados (carteira e posições) da Bitget, OKX e Bybit de forma unificada e em tempo real.

## 🚀 Visão Geral e Arquitetura

O projeto foi construído com a premissa de **Zero Trust Security**. Nenhuma credencial de API trafega livremente para servidores de terceiros ou banco de dados centralizado. Todas as chaves são armazenadas exclusivamente no `localStorage` do navegador do usuário. 

A arquitetura resolve o problema tradicional de CORS em integrações de API financeiras da seguinte forma:
1. **WebSockets (Real-time):** A conexão é feita de forma nativa e direta pelo navegador às corretoras. A autenticação é assinada via HMAC-SHA256 no client-side (`crypto-js`).
2. **REST API (Histórico de Posições):** Como navegadores sofrem bloqueio de CORS ao fazer requisições GET para os endpoints da API V5/V2 das corretoras, empregamos um "Proxy Burro" (Dumb Proxy) local (`server.ts` Node.js+Express). O front-end *assina as requisições no navegador* e envia os cabeçalhos pré-assinados (headers) para o proxy local, que apenas espelha a requisição e devolve os dados, garantindo que o Secret nunca seja exposto desnecessariamente ou armazenado no server.

## ⚙️ Tecnologias Utilizadas
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React
- **Gerenciamento de Estado**: Zustand (`useDashboardStore` e `useApiKeysStore`)
- **Backend / Proxy**: Node.js com Express e Node-Fetch
- **Segurança**: Criptografia base HMAC-SHA256 local, via `crypto-js`

## 📦 Configuração e Execução

### Pré-requisitos
- Node.js versão 18 ou superior.

### 1. Instalando Dependências
Na raiz do projeto, execute:
```bash
npm install
```

### 2. Rodando o Projeto (Modo Desenvolvimento)
Execute o comando abaixo iniciar tanto o proxy (backend) quanto o ambiente frontend (que utiliza o Vite localmente na porta `3000`):
```bash
npm run dev
```

### 3. Build para Produção
```bash
npm run build
npm start
```

## 🔐 Configurando as APIs no Dashboard
1. Abra a aplicação (por padrão em `http://localhost:3000`).
2. No menu lateral, clique em **API Keys**.
3. Selecione a exchange desejada e insira as credenciais (Key, Secret e Passphrase caso aplicável).
4. As credenciais serão validadas e, em seguida, os WebSockets abrirão a conexão automaticamente. A "Luz" indicadora alternará para Verde (conectado).

## 🛠 Features Concluídas
- ✅ Gerenciador de Chaves de API local criptografado em repouso parcial (`localStorage`).
- ✅ WebSockets Privados suportando assinatura por prehash (Bitget: mili, OKX: timestamp ISO, Bybit: hex).
- ✅ Motor de auto-reconexão e heartbeats nativos (`ping` `pong`).
- ✅ Dashboard consolidado exibindo total financeiro global ($ USD).
- ✅ Dashboard de Posições ao vivo.
- ✅ Histórico de Posições (últimas 24h) puxado via chamada REST através do Proxy HTTPs.
