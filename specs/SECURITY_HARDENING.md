# Security Posture & Hardening (SECURITY_HARDENING)

Este documento descreve as vulnerabilidades e os riscos de segurança (OWASP) identificados na infraestrutura do projeto, além de analisar o fluxo de credenciais (Secrets Audit).

## 1. Secrets Audit & Cryptography (`ExchangeAuth.ts`)

O arquivo responsável por assinar as requisições (`src/services/ExchangeAuth.ts`) opera corretamente sem o vazamento de segredos via logs ou armazenamento hardcoded. Toda a criptografia usa `CryptoJS.HmacSHA256`.

Entretanto, foram identificados riscos em relação à janela de validade temporal (Replay Attacks):

*   **Bybit Recv-Window:** A constante `recvWindow` está fixada em `10000` (10 segundos). A documentação oficial da Bybit orienta o uso de `5000` (5 segundos) como padrão de segurança. Uma janela maior aumenta a superfície de ataque para interceptação e reuso do payload assinado (*Replay Attack*).
*   **Adoção de Crypto-JS:** Como mencionado no `ARCH_OVERVIEW`, a biblioteca `crypto-js` não é a mais moderna para uso em navegador. Refatorar as assinaturas para utilizar a Web Crypto API nativa (`window.crypto.subtle`) removeria uma dependência pesada e aumentaria a segurança de execução.

## 2. Server-Side Request Forgery (SSRF) no Proxy Local

O servidor proxy (`server.ts`) construído para contornar o CORS atua como um roteador aberto:
```typescript
const { targetUrl, method, headers, body } = req.body;
// Nenhuma validação do domínio em targetUrl
const response = await fetch(targetUrl, fetchOptions);
```

**Risco:** 
Qualquer aplicação rodando na mesma máquina (ou se a porta 3000 for exposta) pode usar este *endpoint* para disparar requisições contra a rede interna do roteador do usuário ou para atacar outros sites disfarçado pelo IP do usuário. Isso é a definição clássica de **SSRF (Server-Side Request Forgery)**.

**Solução (Least Privilege):**
Deve ser implementada uma **Allowlist** rigorosa validando a URL de destino. O proxy só deve processar requisições direcionadas para os domínios mapeados:
*   `api.bybit.com`
*   `api.bitget.com`
*   `www.okx.com`

## 3. Denial of Service (DoS) via Payload Size

Ainda no `server.ts`, a interceptação do corpo da requisição não possui mitigação contra payloads gigantes:
```typescript
app.use(express.json());
app.use(express.text()); 
```

**Risco:** 
A ausência de limitação no `body-parser` (OWASP A05:2021-Security Misconfiguration) permite que ataques de negação de serviço travem o Node.js enviando gigabytes de dados para o proxy.

**Solução:**
Adicionar o parâmetro de restrição de tamanho, adequado para as respostas JSON das corretoras:
```typescript
app.use(express.json({ limit: '1mb' }));
app.use(express.text({ limit: '1mb' }));
```

## 4. Least Privilege e Zero-Trust (Frontend)

O sistema de front-end gerencia as chaves de API exclusivamente no lado do cliente (`localStorage`) e passa as chaves para a memória através do Zustand. Isso está em perfeita conformidade com a arquitetura Zero-Trust proposta, garantindo que mesmo que o servidor Node (`server.ts`) seja comprometido, as chaves não estão armazenadas nele, mas o tráfego interceptado ainda poderia conter os *headers* assinados. Por rodar exclusivamente em `localhost`, essa superfície de ataque é aceitável, desde que o SSRF seja mitigado.
