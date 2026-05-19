# Security Posture & Hardening (SECURITY_HARDENING)

Este documento descreve as medidas de segurança e mitigações de risco proativas (baseadas na referencial OWASP) vigentes na infraestrutura do projeto. O modelo implementado prioriza conformidade total com políticas Zero-Trust, Least Privilege e processamento criptográfico higiênico.

## 1. Secrets Audit & Cryptography (Web Crypto API)

Toda a criptografia atuante na base da aplicação (`src/services/ExchangeAuth.ts`) opera estritamente via motor central do browser, assegurando zero persistência ou exposição.
*   **Native Web Crypto:** Assegurando diminuta superfície de ataque para _supply-chain_, erradicamos pacotes antigos em prol da utilização assíncrona orientada das primitivas originárias (`window.crypto.subtle.importKey` e `sign`) executando toda derivação `HMAC-SHA256` nativamente para assinaturas das _exchanges_.
*   **Mitigação de Replay Attacks (Bybit):** O horizonte limite exposto (_Time-to-Live_) foi formalmente calibrado: o parâmetro `recv_window` é injetado sistematicamente num crivo estrito limitante seguro de **5 segundos (5000ms)**.

## 2. Prevenção a Server-Side Request Forgery (SSRF) no Proxy

O servidor proxy embarcado (`server.ts`), encarregado de contornar gargalos de CORS para o frontend, possui enclausuramento rígido para não servir como um vetor manipulável:
* **Medidas Ativas:**
  Uma **Allowlist Sanitizada** submete invariavelmente qualquer requisição de *payload* à verificação de escopo. Se sua base `hostname` divergir da rede validada e oficial, a chamada HTTP exibe _403 Forbidden_. Domínios validados:
  *   `api.bybit.com`
  *   `api.bitget.com`
  *   `www.okx.com`
  *   `api.okx.com`

## 3. Prevenção de Denial of Service (DoS)

* **Medidas Ativas:**
  As instâncias dos conversores corporais do express (`body-parser`) carregam agora um estrangulamento deliberado formatado. Os tratamentos explicitam `express.json({ limit: '1mb' })`. Sem referida barreira, vetores internos (mesmo que escopo _localhost_) seriam dispostos à sobreesforço processual saturando o Event-Loop do Node com chamativas mal-intencionadas ultra pesadas.

## 4. Least Privilege e Zero-Trust (Controle Direcional)

O sistema front-end gerencia a chave-mestra transitória isolada exclusivamente no contexto do `localStorage`. O tráfego dirigido remotamente porta previamente toda assinatura matemática. Mesmo se a ponta servidora fosse inspecionada, senhas privadas permanecem ofuscadas no lado do cliente. Nenhuma chave secreta em momento algum é exposta num barramento claro no proxy ou em nuvem terceirizada.
