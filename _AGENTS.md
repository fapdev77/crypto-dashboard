# 🏛 Regras Governamentais do Agente (CONSTITUTION.md)

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

---

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### Example 1: Hidden Assumptions

**User Request:** "Add a feature to export user data"

**❌ What LLMs Do (Wrong Assumptions)**

```python
def export_users(format='json'):
    """Export all users to a file."""
    users = User.query.all()
    
    if format == 'json':
        with open('users.json', 'w') as f:
            json.dump([u.to_dict() for u in users], f)
    elif format == 'csv':
        with open('users.csv', 'w') as f:
            writer = csv.DictWriter(f, fieldnames=['id', 'email', 'name'])
            writer.writeheader()
            writer.writerows([u.to_dict() for u in users])
    
    return f"Exported {len(users)} users"
```

**Problems:**
- Assumed it should export ALL users (what about pagination? privacy?)
- Assumed file location without asking
- Assumed which fields to include
- Assumed CSV fieldnames without checking actual data structure

**✅ What Should Happen (Surface Assumptions)**

```
Before implementing, I need to clarify:

1. **Scope**: Export all users or filtered subset? (privacy implications)
2. **Format**: You mentioned "export" - did you mean:
   - Download file in browser?
   - Background job with email notification?
   - API endpoint returning data?
3. **Fields**: Which user fields? (some might be sensitive)
4. **Volume**: How many users typically? (affects approach)

Simplest approach: Add an API endpoint that returns paginated JSON.
Would need more info for file-based exports.

What's your preference?
```

### Example 2: Multiple Interpretations

**User Request:** "Make the search faster"

**❌ What LLMs Do (Pick Silently)**

```python
# Adds caching, database indexes, and async processing
# without asking which "faster" matters
@lru_cache(maxsize=1000)
async def search(query: str) -> List[Result]:
    # ... 200 lines of optimization code
```

**✅ What Should Happen**

```
"Make the search faster" could mean:

1. **Faster response time** (< 100ms instead of 500ms)
   - Add database indexes
   - Cache frequent queries
   - Estimated effort: 2 hours

2. **Handle more concurrent searches** (throughput)
   - Add async/await
   - Connection pooling
   - Estimated effort: 4 hours

3. **Faster perceived speed** (UX)
   - Show partial results immediately
   - Progressive loading
   - Estimated effort: 3 hours

Current search takes ~500ms for typical queries. 
Which aspect matters most for your use case?
```

---

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### Example 1: Over-abstraction

**User Request:** "Add a function to calculate discount"

**❌ What LLMs Do (Overengineered)**

```python
from abc import ABC, abstractmethod
from enum import Enum
from typing import Protocol, Union
from dataclasses import dataclass

class DiscountStrategy(ABC):
    @abstractmethod
    def calculate(self, amount: float) -> float:
        pass

class PercentageDiscount(DiscountStrategy):
    def __init__(self, percentage: float):
        self.percentage = percentage
    
    def calculate(self, amount: float) -> float:
        return amount * (self.percentage / 100)

class FixedDiscount(DiscountStrategy):
    def __init__(self, fixed_amount: float):
        self.fixed_amount = fixed_amount
    
    def calculate(self, amount: float) -> float:
        return min(self.fixed_amount, amount)

@dataclass
class DiscountConfig:
    strategy: DiscountStrategy
    min_purchase: float = 0.0
    max_discount: float = float('inf')

class DiscountCalculator:
    def __init__(self, config: DiscountConfig):
        self.config = config
    
    def apply_discount(self, amount: float) -> float:
        if amount < self.config.min_purchase:
            return 0
        discount = self.config.strategy.calculate(amount)
        return min(discount, self.config.max_discount)

# Usage requires 30+ lines of setup for a simple calculation
```

**✅ What Should Happen (Simple)**

```python
def calculate_discount(amount: float, percent: float) -> float:
    """Calculate discount amount. percent should be 0-100."""
    return amount * (percent / 100)

# Usage
discount = calculate_discount(100.0, 10.0)  # $10 off
```

**When to add complexity:** Only when you actually need multiple discount types. If that requirement comes later, refactor then.

### Example 2: Speculative Features

**User Request:** "Save user preferences to database"

**❌ What LLMs Do (Unnecessary Features)**

```python
class PreferenceManager:
    def __init__(self, db, cache=None, validator=None):
        self.db = db
        self.cache = cache or InMemoryCache()
        self.validator = validator or DefaultValidator()
    
    def save(self, user_id: int, prefs: dict, 
             merge: bool = True, 
             validate: bool = True,
             notify: bool = False) -> bool:
        """Save preferences with optional merging, validation, and notifications."""
        
        if validate:
            errors = self.validator.validate(prefs)
            if errors:
                raise ValidationError(errors)
        
        existing = self.get(user_id) if merge else {}
        
        if merge:
            existing.update(prefs)
            prefs = existing
        
        self.db.execute(
            "UPDATE users SET preferences = ? WHERE id = ?",
            (json.dumps(prefs), user_id)
        )
        
        if self.cache:
            self.cache.set(f"prefs:{user_id}", prefs)
        
        if notify:
            self.notify_preference_change(user_id, prefs)
        
        return True
    
    def notify_preference_change(self, user_id: int, prefs: dict):
        # Another 30 lines for a feature nobody asked for
        pass
```

**✅ What Should Happen (Just What Was Asked)**

```python
def save_preferences(db, user_id: int, preferences: dict):
    """Save user preferences to database."""
    db.execute(
        "UPDATE users SET preferences = ? WHERE id = ?",
        (json.dumps(preferences), user_id)
    )
```

**Add later if needed:** Caching (when performance matters), validation (when bad data appears), merging (when requirement emerges).

---

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### Example 1: Drive-by Refactoring

**User Request:** "Fix the bug where empty emails crash the validator"

**❌ What LLMs Do (Too Much)**

```diff
  def validate_user(user_data):
-     # Check email format
-     if not user_data.get('email'):
+     """Validate user data."""
+     email = user_data.get('email', '').strip()
+     
+     # Validate email
+     if not email:
          raise ValueError("Email required")
-     
-     # Basic email validation
-     if '@' not in user_data['email']:
+     if '@' not in email or '.' not in email.split('@')[1]:
          raise ValueError("Invalid email")
      
-     # Check username
-     if not user_data.get('username'):
+     # Validate username
+     username = user_data.get('username', '').strip()
+     if not username:
          raise ValueError("Username required")
+     if len(username) < 3:
+         raise ValueError("Username too short")
+     if not username.isalnum():
+         raise ValueError("Username must be alphanumeric")
      
      return True
```

**Problems:**
- "Improved" email validation beyond the bug fix
- Added username validation nobody asked for
- Changed comments
- Added docstring

**✅ What Should Happen (Surgical)**

```diff
  def validate_user(user_data):
      # Check email format
-     if not user_data.get('email'):
+     email = user_data.get('email', '')
+     if not email or not email.strip():
          raise ValueError("Email required")
      
      # Basic email validation
-     if '@' not in user_data['email']:
+     if '@' not in email:
          raise ValueError("Invalid email")
      
      # Check username
      if not user_data.get('username'):
          raise ValueError("Username required")
      
      return True
```

**Only changed:** The specific lines that fix empty email handling.

### Example 2: Style Drift

**User Request:** "Add logging to the upload function"

**❌ What LLMs Do (Reformat Everything)**

```diff
- def upload_file(file_path, destination):
+ def upload_file(file_path: str, destination: str) -> bool:
+     """Upload file to destination with logging."""
+     logger.info(f"Uploading {file_path} to {destination}")
+     
      try:
-         with open(file_path, 'rb') as f:
-             data = f.read()
-         
-         response = requests.post(destination, files={'file': data})
-         
-         if response.status_code == 200:
-             return True
-         else:
-             return False
+         with open(file_path, "rb") as f:
+             data = f.read()
+         response = requests.post(destination, files={"file": data})
+         success = response.status_code == 200
+         
+         if success:
+             logger.info(f"Upload successful: {file_path}")
+         else:
+             logger.error(f"Upload failed: {file_path}, status={response.status_code}")
+         
+         return success
      except Exception as e:
-         print(f"Error: {e}")
+         logger.exception(f"Upload error for {file_path}: {e}")
          return False
```

**Problems:**
- Changed quote style ('' to "")
- Added type hints nobody asked for
- Added docstring
- Reformatted whitespace
- Changed boolean return logic

**✅ What Should Happen (Match Existing Style)**

```diff
+ import logging
+ 
+ logger = logging.getLogger(__name__)
+ 
  def upload_file(file_path, destination):
+     logger.info(f'Starting upload: {file_path}')
      try:
          with open(file_path, 'rb') as f:
              data = f.read()
          
          response = requests.post(destination, files={'file': data})
          
          if response.status_code == 200:
+             logger.info(f'Upload successful: {file_path}')
              return True
          else:
+             logger.error(f'Upload failed: {file_path}, status={response.status_code}')
              return False
      except Exception as e:
-         print(f"Error: {e}")
+         logger.exception(f'Upload error: {file_path}')
          return False
```

**Matched:** Single quotes, no type hints, existing boolean pattern, spacing style.

---

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

### Example 1: Vague vs. Verifiable

**User Request:** "Fix the authentication system"

**❌ What LLMs Do (Vague Approach)**

```
I'll fix the authentication system by:
1. Reviewing the code
2. Identifying issues
3. Making improvements
4. Testing the changes

[Proceeds to make changes without clear success criteria]
```

**✅ What Should Happen (Verifiable Goals)**

```
To "fix authentication," I need to define success criteria. 
What specific issue are we solving?

If the issue is "users stay logged in after password change":

Plan:
1. Write test: Change password → verify old session invalidated
   Verify: Test fails (reproduces bug)

2. Implement: Invalidate sessions on password change
   Verify: Test passes

3. Check edge cases: Multiple active sessions, concurrent changes
   Verify: Additional tests pass

4. Verify no regression: Existing auth tests still pass
   Verify: Full test suite green

Current test coverage for auth: [shows coverage]
What's the specific auth issue you're seeing?
```

### Example 2: Multi-Step with Verification

**User Request:** "Add rate limiting to the API"

**❌ What LLMs Do (All at Once)**

```python
# Implements full rate limiting with Redis, multiple strategies,
# configuration system, and monitoring in one 300-line commit
# No clear verification steps
```

**✅ What Should Happen (Incremental with Verification)**

```
Plan for rate limiting:

1. Add basic in-memory rate limiting (single endpoint)
   Verify: 
   - Test: 100 requests → first 10 succeed, rest get 429
   - Manual: curl endpoint 11 times, see rate limit error

2. Extract to middleware (apply to all endpoints)
   Verify:
   - Test: Rate limits apply to /users and /posts
   - Existing endpoint tests still pass

3. Add Redis backend (for multi-server)
   Verify:
   - Test: Rate limit persists across app restarts
   - Test: Two app instances share rate limit counter

4. Add configuration (rates per endpoint)
   Verify:
   - Test: /search allows 10/min, /users allows 100/min
   - Config file parsed correctly

Each step is independently verifiable and deployable.
Start with step 1?
```

### Example 3: Test-First Verification

**User Request:** "The sorting breaks when there are duplicate scores"

**❌ What LLMs Do (Fix Without Reproducing)**

```python
# Immediately changes sort logic without confirming the bug
def sort_scores(scores):
    return sorted(scores, key=lambda x: (-x['score'], x['name']))
```

**✅ What Should Happen (Reproduce First)**

```python
# 1. First, write a test that reproduces the issue
def test_sort_with_duplicate_scores():
    """Test sorting when multiple items have same score."""
    scores = [
        {'name': 'Alice', 'score': 100},
        {'name': 'Bob', 'score': 100},
        {'name': 'Charlie', 'score': 90},
    ]
    
    result = sort_scores(scores)
    
    # The bug: order is non-deterministic for duplicates
    # Run this test multiple times, it should be consistent
    assert result[0]['score'] == 100
    assert result[1]['score'] == 100
    assert result[2]['score'] == 90

# Verify: Run test 10 times → fails with inconsistent ordering

# 2. Now fix with stable sort
def sort_scores(scores):
    """Sort by score descending, then name ascending for ties."""
    return sorted(scores, key=lambda x: (-x['score'], x['name']))

# Verify: Test passes consistently
```

---

## Anti-Patterns Summary

| Principle | Anti-Pattern | Fix |
|-----------|-------------|-----|
| Think Before Coding | Silently assumes file format, fields, scope | List assumptions explicitly, ask for clarification |
| Simplicity First | Strategy pattern for single discount calculation | One function until complexity is actually needed |
| Surgical Changes | Reformats quotes, adds type hints while fixing bug | Only change lines that fix the reported issue |
| Goal-Driven | "I'll review and improve the code" | "Write test for bug X → make it pass → verify no regressions" |

## Key Insight

The "overcomplicated" examples aren't obviously wrong—they follow design patterns and best practices. The problem is **timing**: they add complexity before it's needed, which:

- Makes code harder to understand
- Introduces more bugs
- Takes longer to implement
- Harder to test

The "simple" versions are:
- Easier to understand
- Faster to implement
- Easier to test
- Can be refactored later when complexity is actually needed

**Good code is code that solves today's problem simply, not tomorrow's problem prematurely.**

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

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

10. **Serverless & REST-Only Architecture (Vercel Compatibility)**:
    - The application is designed to be fully compatible with Vercel Serverless deployments.
    - **No WebSockets**: Do not use WebSocket connections for core data fetching (except strictly isolated modules like API Tester). All exchange data fetching must be executed exclusively via REST polling to ensure stateless serverless execution and avoid connection timeouts.
    - **Proxy Function**: All external API requests to exchanges that require CORS bypassing or IP obfuscation (e.g., Bybit US geo-blocking) must pass through the Vercel serverless function (`/api/proxy`). This function handles necessary header stripping (like `Origin`, `Host`) and enforces domain whitelists to prevent SSRF vulnerabilities.




