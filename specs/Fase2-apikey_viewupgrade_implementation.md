# API Key View Upgrade — Spec de Implementação

## Objetivo
Substituir completamente o componente `ApiKeys.tsx` atual (layout sidebar-list + detail-panel) por uma nova interface de gerenciamento de chaves com:
1. **Tabela de Conexões com Acordeão** agrupando chaves por exchange
2. **Modal unificado** para cadastro, edição e remoção de chaves
3. **Terminal de Logs em tempo real** fixo no rodapé da view, com altura ajustável via drag

---

## 1. Arquitetura de Componentes

### Componentes a Criar/Modificar

| Componente | Tipo | Descrição |
|---|---|---|
| `ApiKeys.tsx` | **[REWRITE]** | View principal — contém a tabela acordeão + terminal |
| `ApiKeyModal.tsx` | **[NEW]** | Modal para criar, editar e remover chaves API |
| `ConnectionLogTerminal.tsx` | **[NEW]** | Terminal de logs fixo no rodapé com drag-resize |
| `logStore.ts` | **[NEW]** | Store Zustand para centralização de logs |

### Componentes Reutilizados (já existentes)
- `<ExchangeIcon />` — `src/components/ui/ExchangeIcon.tsx`
- `<Sparkline />` — `src/components/ui/Sparkline.tsx`
- `useApiKeysStore` — `src/store/apiKeysStore.ts`
- `useDashboardStore` — `src/store/dashboardStore.ts` (para `statuses`, `errors`)

---

## 2. Layout da View Principal (`ApiKeys.tsx`)

```
┌──────────────────────────────────────────────────────────┐
│  API Connections Table                    [+ New API Key] │
├──────────────────────────────────────────────────────────┤
│  ▼  <ExchangeIcon> Bybit Exchange                        │
│     ┌──────┬────────┬───────────┬────────────┬─────────┐ │
│     │Status│Latency │Throughput │ Label      │ Actions │ │
│     ├──────┼────────┼───────────┼────────────┼─────────┤ │
│     │Active│ ~35ms  │ ▌▌▌▌▌    │ Sub1       │ ✎ ⏻ 🗑  │ │
│     │Active│ ~42ms  │ ▌▌▌▌     │ Main       │ ✎ ⏻ 🗑  │ │
│     └──────┴────────┴───────────┴────────────┴─────────┘ │
│  ▼  <ExchangeIcon> Bitget Exchange                       │
│     ...                                                   │
│  ▶  <ExchangeIcon> OKX Exchange (collapsed)              │
├─── drag handle ─────────────────────────────────────────┤
│  Live Connection Log [Terminal View]                      │
│  [2024-05-15 10:30:45] [Sub1] [INFO] Connected...        │
│  [2024-05-15 10:30:46] [Main] [DATA] Heartbeat...        │
│  > _                                                      │
├──────────────────────────────────────────────────────────┤
│  Connections: 5 Active | Latency: 38ms                   │
└──────────────────────────────────────────────────────────┘
```

---

## 3. Tabela de Conexões (Acordeão)

### 3.1 Cabeçalho do Grupo (Exchange)
- Linha expansível com `<ExchangeIcon />`, nome da exchange e chevron animado (rotação 90° → 0° ao expandir)
- Transição suave de altura (`max-height` ou `grid-template-rows: 0fr → 1fr`) com `transition-all duration-300`
- Background levemente diferenciado: `bg-[#1a1b1e]`
- Exibir contador de conexões ativas ao lado do nome (badge)

### 3.2 Colunas de Dados por Linha

| Coluna | Conteúdo | Detalhes Visuais |
|---|---|---|
| **Label** | Nome da conexão (`apiKey.label`) | `text-sm font-medium text-white` |
| **Status** | Badge com status da conexão | `connected` → badge verde neon `border-[#00C853] text-[#00C853] bg-[#00C853]/10`, `error` → badge vermelho, `connecting` → badge amber com `animate-pulse`, `disconnected` → badge cinza |
| **Latency** | Sparkline SVG + valor em ms | Reutilizar `<Sparkline />` existente (color='emerald'), valor numérico à direita em `font-mono text-xs`. Dados coletados via telemetria real do WebSocket (ver seção 6) |
| **Throughput** | Micro-barras verticais + valor em KB/s | SVG com barras (`rect`) de 3px de largura, altura proporcional ao throughput. Dados reais do WebSocket |
| **Actions** | Grupo de ícones-botão | Editar (Pencil), Toggle On/Off (Power), Excluir (Trash2). Hover: `scale-105` + brilho de cor (`hover:text-[#2F6BFF]` / `hover:text-[#FF4444]`) |

### 3.3 Interações
- Click no cabeçalho do grupo → expande/colapsa suavemente
- Click no botão Editar → abre `<ApiKeyModal mode="edit" />`
- Click no botão Power → chama `toggleKey(id)` + `clearConnectionData(id)` se desativando
- Click no botão Excluir → abre confirmação inline ou modal de confirmação
- Hover nas linhas de dados → `hover:bg-[#2a2b30]/30` sutil

---

## 4. Modal Unificado (`ApiKeyModal.tsx`)

### Props
```typescript
interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  existingKey?: ApiCredentials; // undefined para 'create'
}
```

### Funcionalidades
- **Modo Create**: Formulário limpo com seleção de exchange (dropdown com `<ExchangeIcon />`), label, API Key, API Secret, Passphrase (condicional por exchange)
- **Modo Edit**: Pré-preenche label e exibe API Key mascarada (somente primeiros 8 + últimos 4 chars). API Secret e Passphrase não são editáveis (segurança).
- **Validação**: Campos obrigatórios com feedback visual (`border-[#FF4444]` se vazio no submit)
- **Animação**: Overlay com `backdrop-blur-sm` + modal com `animate-in fade-in slide-in-from-bottom-4 duration-200`
- **Ação de Excluir**: Quando em modo edit, exibir botão "Remove" com confirmação de 2 etapas (igual ao atual)

### Design Tokens
- Background: `bg-[#151619]`, borda: `border-[#2a2b30]`
- Inputs: `bg-[#1a1b1e] border-[#2a2b30] focus:border-[#2F6BFF]`
- Botão primário: `bg-[#2F6BFF] hover:bg-[#1E56DF]`

---

## 5. Terminal de Logs (`ConnectionLogTerminal.tsx`)

### 5.1 Layout
- Container fixo na parte inferior da view de API Keys apenas (não global)
- Fundo: `bg-[#000000]` (preto puro)
- Tipografia: `font-mono` (JetBrains Mono, já configurado no `index.css`)
- Altura inicial: `240px`, redimensionável via drag handle no topo
- Auto-scroll para baixo conforme novas entradas são adicionadas
- Prompt visual: `> _` com cursor piscando (`animate-pulse`)

### 5.2 Formatação das Entradas
```
[YYYY-MM-DD HH:mm:ss.SSS] [ConnectionLabel] [LEVEL] Mensagem
```

Cores por nível:
| Nível | Cor | Exemplo |
|---|---|---|
| `INFO` | `text-[#00C853]` (verde neon) | Conexão estabelecida |
| `WARN` | `text-[#F2C94C]` (amber) | Rate limit approaching |
| `ERROR` | `text-[#FF4444]` (vermelho) | Authentication failed |
| `DATA` | `text-[#2F6BFF]` (azul brand) | Heartbeat received |
| `SYSTEM` | `text-[#8E9299]` (cinza) | Health check |

### 5.3 Filtros
- Barra de filtros acima do terminal com toggles para cada nível (INFO, WARN, ERROR, DATA, SYSTEM)
- Filtro por texto (search input)
- Filtro por conexão (dropdown com labels das conexões ativas)
- Botão "Clear" para limpar o buffer

### 5.4 Status Bar do Terminal
- Barra inferior com: `Connections: N Active | Latency: Xms` (métricas agregadas)

---

## 6. Log Store (`logStore.ts`)

### Interface
```typescript
type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DATA' | 'SYSTEM';

interface LogEntry {
  id: string;            // crypto.randomUUID()
  timestamp: number;     // Date.now()
  level: LogLevel;
  source: string;        // Label da conexão ou 'SYSTEM'
  message: string;
}

interface LogState {
  entries: LogEntry[];
  maxEntries: number;    // Default: 1000
  addLog: (level: LogLevel, source: string, message: string) => void;
  clearLogs: () => void;
}
```

### Interceptação de Console
- Na inicialização do app (`main.tsx` ou `App.tsx`), fazer monkey-patch do `console.log`, `console.warn` e `console.error`
- Mapear padrões existentes nos logs (ex: `[WS-${cid}]`, `[Time-Sync]`, `[ExchangeAggregator]`) para extrair `source` e `level` automaticamente
- Manter o `console` original funcional (chamar `originalConsole.log(...)` após capturar)

---

## 7. Coleta de Telemetria (Latency & Throughput)

### Implementação Real via WebSocket

Como os dados devem ser reais, será necessário instrumentar os WebSocket managers:

1. **Latency**: Medir o tempo entre o envio do ping e o recebimento do pong no WebSocket. Armazenar os últimos 20 valores para alimentar o `<Sparkline />`.
2. **Throughput**: Contabilizar bytes recebidos por segundo nos handlers `onmessage`. Armazenar os últimos 20 valores para as micro-barras.

### Store de Telemetria
Adicionar ao `dashboardStore.ts` ou criar `telemetryStore.ts`:

```typescript
interface ConnectionTelemetry {
  latencyHistory: number[];    // últimos 20 pings em ms
  throughputHistory: number[]; // últimos 20 amostras em bytes/s
  lastPingMs: number;
  bytesPerSecond: number;
}

// Keyed by connectionId
telemetry: Record<string, ConnectionTelemetry>;
```

---

## 8. Design System (Tokens Aplicáveis)

### Cores — Respeitar o tema atual da aplicação
- Backgrounds: `#0b0c10` (terminal), `#151619` (cards), `#1a1b1e` (inputs), `#2a2b30` (borders)
- Texto: `#ffffff` (primary), `#8E9299` (secondary), `#00C853` (success), `#FF4444` (error), `#F2C94C` (warning), `#2F6BFF` (brand/info)
- Exchange colors: `--color-bitget: #03aac7`, `--color-okx: #fafafa`, `--color-bybit: #ff9c2e` (já definidos no `index.css`)

### Tipografia
- `font-sans` (Inter) para labels e UI
- `font-mono` (JetBrains Mono) para **todos os dados numéricos**, logs, identificadores de chaves, valores de latência e throughput — já configurado no `@theme` do `index.css`

### Animações
- Acordeão: `transition-all duration-300 ease-in-out`
- Hover em botões de ação: `transition-transform duration-150 hover:scale-105`
- Modal: `animate-in fade-in slide-in-from-bottom-4 duration-200`
- Terminal auto-scroll: `scroll-behavior: smooth`
- Cursor do terminal: `animate-pulse`

---

## 9. Sidebar — Sem Alterações
A entrada `api-keys` no `Sidebar.tsx` (linha 155) já existe e aponta para `activeTab === 'api-keys'`. Nenhuma modificação necessária na navegação.

---

## 10. Critérios de Aceitação

- [ ] View de API Keys substitui completamente o componente atual
- [ ] Chaves agrupadas por exchange com acordeão funcional e animado
- [ ] Colunas Status, Latency (Sparkline real), Throughput (micro-barras reais), Actions visíveis
- [ ] Modal funcional para criar, editar (label) e remover chaves
- [ ] Terminal de logs exibe entradas em tempo real com cores por nível
- [ ] Filtros do terminal funcionais (por nível, por conexão, por texto)
- [ ] Terminal com altura ajustável via drag
- [ ] Dados de Latency e Throughput coletados via instrumentação real do WebSocket
- [ ] `logStore.ts` intercepta `console.log/warn/error` e alimenta o terminal
- [ ] Tipografia JetBrains Mono aplicada a todos os dados numéricos e logs
- [ ] Responsividade mantida em telas menores (mobile-friendly)
- [ ] Nenhuma API key/secret exposta em texto puro (mascaramento obrigatório)

---

## 11. Dependências Externas
Nenhuma nova dependência necessária. Tudo será construído com:
- React + TypeScript (existente)
- Zustand (existente)
- Tailwind CSS v4 (existente)
- Lucide React para ícones (existente)
- SVG nativo para Sparkline e micro-barras (componente existente)

---

## 12. Referências Visuais
A imagem de referência fornecida mostra o layout alvo com:
- Tabela com agrupamento por exchange (Bybit, Bitget)
- Sparklines de latência azuis
- Micro-barras de throughput verdes
- Terminal preto com texto colorido por nível
- Barra de status inferior
