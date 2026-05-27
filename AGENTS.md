# System Instructions & Project Guidelines

When developing in this project, enforce the following rules:

1. **Schema Consistency Protocol**: If you update the properties or types in the Unified Interfaces (e.g., `src/types.ts` like `UnifiedHistoryPosition`, `UnifiedPosition`), you MUST:
   - Update `src/mock/generateMocks.js` and run it via `npx tsx src/mock/generateMocks.js` to ensure JSON mock payloads match the new interface.
   - Increment the schema version in IndexedDB (`src/services/historyCache.ts`) and add migration/upgrade paths for the new indexes if you alter indexed keys.
   - Audit `src/hooks/*` for any hardcoded references to the old keys (especially sorting and filtering logic).

2. **Zero-Trust**: Do not store API keys locally anywhere other than in memory/localStorage.

3. **No Unsolicited SDKs**: Stick to React/Vite/Tailwind stack.
