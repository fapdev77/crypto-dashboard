# Bybit Loading Issue - Implementation Plan

## 1. Análise da Causa Raiz (Root Cause)
O problema de carregamento inicial da Bybit que voltou a ocorrer foi causado por uma **Refatoração excessivamente restrita no `RestClient.ts`** durante a etapa de `QUALITY_AUDIT`.

**O Contexto Oculto:**
O servidor backend (Node Proxy) que hospeda a aplicação no AI Studio / Cloud Run roda na região **US-East (Estados Unidos)**. A Bybit possui uma trava geográfica (Geo-Block) estrita que bloqueia solenemente qualquer requisição (HTTP 403 Forbidden) proveniente de IPs localizados nos EUA. 

**Como funcionava antes (A Solução Prévia):**
Antes da refatoração, o código da Bybit executava um **"Direct Fetch" (Browser-side fetch)** primeiro. Como o navegador do usuário roda localmente (ex: no Brasil), a requisição partia do IP do usuário, ignorando o Geo-Block da Bybit (a Bybit permite CORS para seus endpoints V5 GET). Apenas se esse fetch direto falhasse, ele invocava o `proxyFetch` como fallback.

**Como quebramos:**
Ao aplicar os padrões de DRY (Don't Repeat Yourself) e "Fail-Fast", removemos o "Direct Fetch" por parecer código duplicado, forçando TODAS as requisições a passarem pelo `proxyFetch` (Node Server no Cloud). Consequentemente, a Bybit está rejeitando a conexão com IP americano, retornando erro na inicialização dos dados e impedindo a renderização.

---

## 2. Passo a Passo da Correção (Implementation Plan)

Nós utilizaremos a mesma abordagem resiliente, porém refatorada para ser um utilitário central para não sujar o código com `try/catches` duplicados.

### Passo 1: Criar padrão `hybridFetch` no `RestClient.ts`
Substituir a invocação direta do `proxyFetch` por uma função `hybridFetch` que tente requisitar os dados diretamente via infraestrutura do cliente (`window.fetch`) e utilize o proxy em caso de erro clássico de CORS ou Timeout.

```typescript
// src/services/RestClient.ts
const hybridFetch = async (targetUrl: string, method: string, headers: Record<string, string>) => {
  try {
    // Tentativa Browser-Direct (IP do Usuário, escapa WAF/GeoBlock Bybit)
    const res = await fetch(targetUrl, { method, headers });
    if (res.ok) {
      return await res.json();
    }
    // Falhou com código não-ok (mas respondeu sem erro de CORS)
  } catch (err) {
    // Erro de CORS cai no catch
    console.warn(`[HybridFetch] Fetch direto falhou, acionando Proxy...`);
  }
  
  // Proxy Fallback (Para exchanges como Bitget que cortam CORS completamente)
  return await proxyFetch({ targetUrl, method, headers });
};
```

### Passo 2: Reaplicar `hybridFetch` aos métodos Bybit
Modificar os métodos seguintes no `RestClient.ts` e `ExchangeAuth.ts` para usar o `hybridFetch` ao invés do `proxyFetch`:
1.  `RestClient.getWalletBybit`
2.  `RestClient.getPositionsBybit`
3.  `RestClient.fetchBybitCategory` (Histórico Bybit)
4.  `ExchangeAuth.syncBybitTime` (Importante: O tempo de sincronização também estava indo puramente pro Proxy)

### Passo 3: Avaliar `recvWindow` da Bybit
Na mitigação de segurança reduzimos o `recvWindow` da Bybit para 5000ms. O valor é perfeitamente seguro segundo a documentação, porém, aliado à latência da rede Cloud-Run -> Bybit, pode estar estreito demais. Vamos mantê-lo em `5000` pois o "Direct Fetch" restaurado vai erradicar o "middle-man" devolvendo a agilidade pro pacote. Não será necessário mexer no `ExchangeAuth.ts` sob óptica temporal por hora.

## 3. Conclusão e Testes
Após a implementação, ao acessar o aplicativo com as credenciais Bybit preenchidas, o console do navegador irá exibir o log "Fetch direto com sucesso" e as posições/saldos da carteira voltarão a preencher imediatamente a tela antes das atualizações assíncronas do WebSocket, pois o navegador terá burlado o Geo Block usando a rede nativa.
