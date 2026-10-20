import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AiModelConfig, AiGlobalSettings } from '../types/aiTypes';

export const DEFAULT_AI_SYSTEM_PROMPT = `You are PIKA (Portfolio Information & Knowledge Assistant), a senior quantitative auditor and exclusive analyst for the Crypto Portfolio Manager application.

YOUR MISSION:
- Rigorously analyze portfolio metrics, balances, orders, open positions, liquidation risks, funding fees, and hedge correlations STRICTLY using the available local tools.
- Deliver concise, executive, high-impact diagnostics focused strictly on actionable numbers.

EXECUTIVE COMMUNICATION & DATA VISUALIZATION RULES:
1. CONCISE & DATA-FIRST (ANTI-PROLIXITY):
   - Be direct and succinct. Avoid conversational filler, generic tutorials, or boilerplate intros/outros.
   - Start immediately with key findings (Key Takeaways) in 2 to 3 bullet points with bold numbers.
   - Restrict explanatory paragraphs to 1 or 2 short sentences.
2. TABLES FOR FINANCIAL METRICS:
   - When presenting asset balances, risk metrics, open positions, or funding fees, ALWAYS use Markdown tables with clear column headers (e.g. Asset | Balance | USD Value | Share % | Risk).
3. INTERACTIVE RECHARTS GENERATION:
   - When an analytical query involves portfolio distribution, asset allocation, capital breakdown, historical PnL, or comparison across exchanges/coins, output an interactive chart block using \`\`\`chart:bar, \`\`\`chart:line, \`\`\`chart:pie, or \`\`\`chart:area with clean JSON.
   - Chart JSON schema:
     {
       "type": "bar" | "line" | "pie" | "donut" | "area",
       "title": "Short Descriptive Title",
       "unit": "$" | "%" | "units",
       "formatAsCurrency": true | false,
       "formatAsPercent": true | false,
       "data": [
         { "name": "BTC", "value": 15000 },
         { "name": "ETH", "value": 8500 }
       ]
     }
4. CLOSED SCOPE: You answer EXCLUSIVELY about data, markets, and configurations of the Crypto Portfolio Manager app.
5. FORMAL REFUSAL: If the user asks about politics, weather, general news, recipes, arbitrary code, or anything outside portfolio/trading analytics, politely refuse: "I am strictly focused on auditing and analyzing your Crypto Portfolio Manager data."
6. STRICTLY READ-ONLY: You NEVER execute trades, modify orders, or transfer funds.
7. MATHEMATICAL ACCURACY & ZERO-HALLUCINATION TOOL MANDATE:
   - For any query concerning account balances, open positions, funding fees, liquidation risks, or order status, you MUST invoke the appropriate local tools:
     * 'aiGetPortfolioBalances' for wallet equity, balances, and asset breakdowns.
     * 'aiGetOpenPositions' for live positions, entry/mark prices, unrealized PnL, leverage.
     * 'aiGetFundingFeesHistory' for actual dollars ($) received or paid in funding from your wallet transaction logs.
     * 'aiGetMarketFundingRates' for market perpetual funding rates (%), cross-exchange rate comparisons, and top/bottom paying asset rankings.
     * 'aiGetHedgeCorrelationSummary' for cross-exchange hedge and net delta metrics.
     * 'aiGetTradingFeesHistory' for trading commissions paid.
     * 'aiGetClosedPositionsSummary' for historical closed trades and win rate.
   - FUNDING CONCEPTS DISTINCTION:
     * Cash-Flow Funding Fees ($): Report exact numbers from 'aiGetFundingFeesHistory': Total Received ($), Total Paid ($), and Net Funding ($). If no funding occurred in the requested period, state explicitly: "$0.00 received/paid" and specify which positions were checked.
     * Market Funding Rates (%): Report percentage rates and 8-decimal rates from 'aiGetMarketFundingRates'. Never confuse theoretical market rates (%) with personal wallet cash flow ($).
   - If you do not have tools or cannot invoke them, DO NOT INVENT or assume sample values. State explicitly: "Unable to retrieve real portfolio metrics without executing exchange tools."
8. SMART SYNCHRONIZATION AWARENESS:
   - When tools return 'syncNotice':
     * If status is 'NO_DATA': state: "No local data found." and advise syncing or connecting keys.
     * If status is 'NO_DATA_SYNCING': state: "No local data found, but synchronization is in progress. Please wait for sync to complete."
     * If status is 'DATA_SYNCING': warn: "Synchronization is in progress. Data may be outdated. Do you want to proceed anyway?"
     * If status is 'NORMAL': proceed with normal evaluation.
9. PRIVACY MODE PROTECTION:
   - When tools report 'privacyModeActive: true', nominal balances and USD values are obfuscated percentually. Analyze relative distributions and percentage shares without fabricating nominal amounts.`;

const DEFAULT_GLOBAL_SETTINGS: AiGlobalSettings = {
  isEnabled: false, // CRITICAL: strictly disabled by default
  defaultTemperature: 0.1,
  defaultTopP: 0.95,
  defaultMaxTokens: 2048,
  baseSystemPrompt: DEFAULT_AI_SYSTEM_PROMPT,
  autoFallback: true,
  obfuscateValues: false,
  maxHistoryRounds: 20,
};

const DEFAULT_MODELS: AiModelConfig[] = [
  {
    id: 'default-ollama-local',
    name: 'Ollama Llama 3.2 (Local Private)',
    provider: 'ollama',
    modelId: 'llama3.2:latest',
    baseUrl: 'http://localhost:11434',
    isActive: true,
    isPrimary: true,
    isFallback: false,
    temperature: 0.1,
    topP: 0.95,
    maxTokens: 2048,
    maxRpm: 0,
    maxRpd: 0,
    supportsTools: true,
  },
  {
    id: 'default-gemini-flash',
    name: 'Google Gemini 3.8 Flash (Cloud)',
    provider: 'gemini',
    modelId: 'gemini-3.8-flash',
    isActive: true,
    isPrimary: false,
    isFallback: true,
    fallbackOrder: 1,
    temperature: 0.1,
    topP: 0.95,
    maxTokens: 2048,
    maxRpm: 60,
    maxRpd: 1500,
    supportsTools: true,
  },
];

interface AiSettingsState {
  globalSettings: AiGlobalSettings;
  models: AiModelConfig[];

  // Actions
  setIsEnabled: (enabled: boolean) => void;
  updateGlobalSettings: (settings: Partial<AiGlobalSettings>) => void;
  addModel: (model: Omit<AiModelConfig, 'id'>) => string;
  updateModel: (id: string, updates: Partial<AiModelConfig>) => void;
  deleteModel: (id: string) => void;
  setPrimaryModel: (id: string) => void;
  setFallbackModel: (id: string, isFallback: boolean, order?: number) => void;
  toggleModelActive: (id: string) => void;
  cloneModel: (id: string) => string | null;
  reorderModel: (id: string, direction: 'up' | 'down') => void;
  resetToDefaults: () => void;
}

export const useAiSettingsStore = create<AiSettingsState>()(
  persist(
    (set, get) => ({
      globalSettings: DEFAULT_GLOBAL_SETTINGS,
      models: DEFAULT_MODELS,

      setIsEnabled: (enabled: boolean) =>
        set((state) => ({
          globalSettings: { ...state.globalSettings, isEnabled: enabled },
        })),

      updateGlobalSettings: (settings: Partial<AiGlobalSettings>) =>
        set((state) => ({
          globalSettings: { ...state.globalSettings, ...settings },
        })),

      addModel: (modelData) => {
        const id = `model-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const newModel: AiModelConfig = {
          ...modelData,
          id,
        };

        set((state) => {
          let updatedModels = [...state.models];
          // If marked as primary, unmark other primary
          if (newModel.isPrimary) {
            updatedModels = updatedModels.map((m) => ({ ...m, isPrimary: false }));
          }
          return { models: [...updatedModels, newModel] };
        });

        return id;
      },

      updateModel: (id: string, updates: Partial<AiModelConfig>) =>
        set((state) => {
          let updatedModels = state.models.map((m) => (m.id === id ? { ...m, ...updates } : m));

          // If updated model is set to primary, make sure no other is primary
          if (updates.isPrimary) {
            updatedModels = updatedModels.map((m) => (m.id === id ? m : { ...m, isPrimary: false }));
          }

          return { models: updatedModels };
        }),

      deleteModel: (id: string) =>
        set((state) => {
          const filtered = state.models.filter((m) => m.id !== id);
          // If deleted was primary and there are still models, designate the first active one as primary
          if (filtered.length > 0 && !filtered.some((m) => m.isPrimary)) {
            const nextPrimary = filtered.find((m) => m.isActive) || filtered[0];
            nextPrimary.isPrimary = true;
          }
          return { models: filtered };
        }),

      setPrimaryModel: (id: string) =>
        set((state) => ({
          models: state.models.map((m) => ({
            ...m,
            isPrimary: m.id === id,
            isFallback: m.id === id ? false : m.isFallback, // cannot be both primary and fallback
          })),
        })),

      setFallbackModel: (id: string, isFallback: boolean, order?: number) =>
        set((state) => ({
          models: state.models.map((m) => {
            if (m.id === id) {
              return {
                ...m,
                isFallback,
                isPrimary: isFallback ? false : m.isPrimary,
                fallbackOrder: order ?? m.fallbackOrder ?? 1,
              };
            }
            return m;
          }),
        })),

      toggleModelActive: (id: string) =>
        set((state) => ({
          models: state.models.map((m) => (m.id === id ? { ...m, isActive: !m.isActive } : m)),
        })),

      cloneModel: (id: string) => {
        const state = get();
        const modelToClone = state.models.find((m) => m.id === id);
        if (!modelToClone) return null;

        const newId = `model-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        const cloned: AiModelConfig = {
          ...modelToClone,
          id: newId,
          name: `${modelToClone.name} (Copy)`,
          isPrimary: false, // Never automatically clone as primary
          isFallback: true,
          fallbackOrder: (modelToClone.fallbackOrder || 1) + 1,
        };

        set({ models: [...state.models, cloned] });
        return newId;
      },

      reorderModel: (id: string, direction: 'up' | 'down') =>
        set((state) => {
          const index = state.models.findIndex((m) => m.id === id);
          if (index === -1) return state;

          const targetIndex = direction === 'up' ? index - 1 : index + 1;
          if (targetIndex < 0 || targetIndex >= state.models.length) return state;

          const newModels = [...state.models];
          const [moved] = newModels.splice(index, 1);
          newModels.splice(targetIndex, 0, moved);

          return { models: newModels };
        }),

      resetToDefaults: () =>
        set({
          globalSettings: DEFAULT_GLOBAL_SETTINGS,
          models: DEFAULT_MODELS,
        }),
    }),
    {
      name: 'pika-ai-settings-v1',
      version: 1,
    }
  )
);
