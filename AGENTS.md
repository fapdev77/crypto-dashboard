# 🏛 Regras Governamentais do Agente (CONSTITUTION.md)

## 1. Fluxo Metodológico Obrigatório (SDD-First)
- **Especificar antes de Codar**: Siga rigorosamente o ciclo: **Especificar (O quê) -> Planejar (Como) -> Decompor (Tarefas) -> Implementar (Código) -> Validar (Testes)**.
- **Proibição de "Geração de Um Clique"**: Nunca gere implementações complexas diretamente de um prompt vago; solicite primeiro uma análise de requisitos e critérios de aceitação e obtenha aprovação do Plano Técnico.
- **Validação de Plano**: Antes de modificar arquivos, apresente um plano técnico e aguarde a aprovação humana para evitar o "Vibe Coding Doom Loop".

## 2. Engenharia de Contexto e Memória
- **Combate ao Context Rot**: Quando a sessão se tornar longa ou confusa, utilize o comando `/compact` ou resuma o estado atual para iniciar uma nova sessão limpa.
- **Divulgação Progressiva**: Mantenha o arquivo principal de regras conciso (< 350 linhas) e aponte para documentos específicos (ex: `/specs/auth.md`) apenas quando necessário para economizar a janela de tokens.
- **Referência à Fonte da Verdade**: Sempre consulte o arquivo `AGENTS.md` no início de cada sessão para garantir a continuidade dos padrões arquiteturais.

## 3. Padrões de Clean Code e Nomenclatura
- **Nomenclatura Intencional**: Utilize nomenclatura baseada em intenção, pattern "Return Early, use nomes de variáveis e funções que expressem "o porquê" e não apenas "o quê"; Evite "noise words" genéricas como: data, info ou model.
- **English Only**: Todo o código, variáveis, funções e comentários devem ser escritos estritamente em Inglês para manter a compatibilidade idiomática da stack.
- **SRP & Funções Curtas**: Cada função deve ter uma única responsabilidade e ter, idealmente, entre 10 a 40 linhas para facilitar a manutenção e testes.
- **Pattern "Return Early"**: Minimize o aninhamento de código priorizando retornos antecipados e validações de entrada no início da função.
- **Aritmética:** Utilize bibliotecas de alta precisão (ex: Big.js) para cálculos financeiros.
- **Não adivinhe:** Se algo for ambíguo na especificação, pergunte antes de assumir uma arquitetura.
- **Consistência de Nomenclatura no Ecossistema**: O projeto deve manter uma padronização estrita e uniforme para variáveis de domínio. Para posições (`UnifiedPosition`), utilize invariavelmente `pos` (nunca varie entre `p`, `row`, `h` ou `t`). Para exchanges, utilize `exchange` ou `exchangeName` (nunca `ex` ou `ext`). Para chaves de API, utilize `apiKey` (nunca `k` ou `key`). Para ativos ou moedas, utilize `symbol` ou `currency`.

## 4. Diretrizes de Comentários e Documentação
- **Código Autodocumentado**: Priorize a clareza do código para que ele seja lido "como um livro". Se uma variável se chama isLiquidationPriceReached, ela não precisa de comentário explicativo.
- **O "Porquê", não o "O Quê"**: Comentários devem explicar decisões de design não óbvias, regras de negócio complexas ou trade-offs técnicos. O código deve deixar claro o que está fazendo por si só.
- **Limpeza de AI Bloat**: Remova obrigatoriamente comentários redundantes gerados por IA que explicam o código linha a linha (ex: // sets value to 10).
- **Documentação de API (JSDoc)**: Use o padrão JSDoc para funções públicas, Hooks customizados e Props de componentes React, descrevendo parâmetros, retornos e possíveis exceções.
- **Sem Código Morto**: Nunca inclua blocos de código comentados. Utilize o histórico do Git para recuperação de versões anteriores.

## 5. Segurança e Qualidade (TDD Nativo)
- **Testes Primeiro (TDD)**: Escreva ou atualize os testes unitários/integração *antes* da implementação para servir como verificador objetivo da tarefa.
- **Crítica Recursiva (RCI)**: Após gerar o código, revise-o internamente em busca de vulnerabilidades de segurança (OWASP), inconsistências de tipos ou erros de lógica antes de apresentar a solução.
- **Gestão de Segredos**: Nunca sugira chaves de API ou segredos em texto puro; utilize apenas referências a variáveis de ambiente ou cofres de segredos.
- **Privacidade:** Nunca armazene ou processe PII em texto puro.

## 6. Documentação e Setup
- **README Dinâmico**: Mantenha as instruções de configuração e execução no `README.md` sempre atualizadas a cada mudança na stack tecnológica, O README.md deve conter instruções de setup determinísticas para que qualquer humano ou agente consiga rodar o projeto do zero [README].
- **Comentários de Valor**: Remova comentários verbosos da IA que apenas descrevem o óbvio; use comentários apenas para explicar decisões de design complexas ou restrições de domínio.
- **Sincronização Contínua**: Sempre atualize o `AGENTS.md` com novas decisões de design, padrões descobertos ou mudanças na stack tecnológica.

## 7. System Instructions & Project Guidelines

When developing in this project, enforce the following rules:

1. **Schema Consistency Protocol**: If you update the properties or types in the Unified Interfaces (e.g., `src/types.ts` like `UnifiedHistoryPosition`, `UnifiedPosition`), you MUST:
   - Update `src/mock/generateMocks.js` and run it via `npx tsx src/mock/generateMocks.js` to ensure JSON mock payloads match the new interface.
   - Increment the schema version in IndexedDB (`src/services/historyCache.ts`) and add migration/upgrade paths for the new indexes if you alter indexed keys.
   - Audit `src/hooks/*` for any hardcoded references to the old keys (especially sorting and filtering logic).

2. **Zero-Trust**: Do not store API keys locally anywhere other than in memory/localStorage.

3. **No Unsolicited SDKs**: Matenha a stack em React/Vite/Tailwind e sempre confirme quando houver necessidade de mudanças na stack ou versões antes de qualquer alteração no código.

4. **Asset Classificação e Logo.dev Strategy (UI/UX)**: Quando lidar ou exibir listagens de ativos ou posições de corretoras na camada de visual, garanta que seja invocada a `AssetClassifierAggregator` para categorizar globalmente o ativo subjacente (e.g. `STOCK` ou `CRYPTO`). A renderização e injeções de imagens devem usar uniformemente o componente `<CoinIcon />`, que oculta a mecânica complexa anti-gap de fallbacks (endpoints `/crypto`, `/ticker`, `/name` via param `fallback=404`). Não recrie `<img>` nativas com regras expostas espalhadas pelas Views.

5. **Interface Hover e Tooltips Unificados:** SEMPRE utilize o componente `<AppTooltip />` encapsulado para exibir informações adicionais, explicações ou popovers no hover de elementos interativos (como Status, Marquees, células de tabelas). NUNCA crie novos componentes absolutos gerados no hover via Tailwind, nem utilize atributos nativos do DOM como `title="..."`. Utilize a estrutura modular `description` e `rows` nativa do componente.

6. **Coordinated History Sync Engine**: Always use the global `lastSyncTime` from `useSettingsStore` to coordinate sync states across multiple historical views. Never create separate or individual local sync state timestamps for historical tabs (Orders, Closed Positions, Trade History, PnL by Symbol) as this causes duplicate requests and rate-limiting issues. Always disable manual synchronization buttons and provide clear visual alerts (e.g. amber Simulation Mode badge) when the user activates `useMockData` (Simulation Mode).

7. **Zero-Leak Logging & UI Masking**: All application telemetry, web socket, and REST events must be piped securely through the global logger interceptor (`logger.ts`). Never output raw secrets (API Secret, Passphrase, API keys) to the console or log terminal. Ensure connection UUIDs are mapped to friendly user labels before display. For financial values, adhere strictly to the global `isPrivateMode` check to mask sensitive figures dynamically in the UI.

8. **Brand Color Consistency**: Ensure brand color variables are applied uniformly across the visual layer:
   - **Bitget**: `#03aac7` (Cyan)
   - **Bybit**: `#ff9c2e` (Orange)
   - **OKX**: `#fafafa` / `#ffffff` (White/Silver)
   Never hardcode arbitrary palette indices for these exchanges; always tie elements like badges, borders, sparklines, and charts to their respective brand identity classes or style variables.

9. **Modular Micro-Stores & OKX Dual-Wallet Ingestion**: 
   - Never combine balances, positions, orders, or connection statuses into a single bloated store (keep them segregated in `useBalancesStore`, `usePositionsStore`, `useOrdersStore`, and `useConnectionStore`).
   - Use the centralized `clearConnectionData` from `src/store/crossStoreCleanup.ts` for uniform connection disposal.
   - For OKX, ensure both the Unified Account balance and the Funding Account balance are ingested concurrently via their respective REST endpoints. Use suffix trackers (e.g., `-UNIFIED-` and `-FUNDING-`) and map them to their corresponding origin values so the `ExchangeHierarchyTable` can display clear visual tagging.




