# Quality Audit & Code Smells (QUALITY_AUDIT)

Este referencial de Qualidade expõe o alto nível de manutenibilidade, resiliência estrutural e robustez alcançados pela aplicação face aos compromissos da arquitetura técnica.

## 1. Resiliência e Ruptura de Viés Positivo (Happy Path Bias)

O código garante a sustentação sem omissão deliberada nos tratamentos de resposta a colapsos de rede, abraçando integralmente percalços ambientais.

### A. Exponential Backoff no WebSocket
A classe responsável agora detêm mecânica regenerativa que aplica retrocesso linear para colapsos via internet ou reatividade em *Rate-Limits* (Reconexões não ocorrem em laço-cego, elas respeitam `Math.min(5000 * Math.pow(2, retryCount), 60000)` escalonando até o teto de pausa).

### B. O Princípio de Falha Rápida (Fail-Fast)
Ao invés do encapsulamento passivo (*Swallowing Errors* onde a inferência sumia por trás de colchetes `[]`), integrações do tipo `RestClient.ts` manifestam e propagam agora falha deliberada via `throw new Error(...)`. Em contrapartida, as engrenagens reativas da Interface interceptam devidamente os sinais por intermédio orgânico do `react-hot-toast`, promovendo visibilidade ativa frente ao usuário e descaracterizando visões deturpadas do dashboard centralizado.

### C. Network Resilience & Geo-Block Defense (Hybrid-Fetch)
Dadas restrições em ecossistemas de Cloud Hosting que operam em data-centers baseados nos Estados Unidos, trocas diretas REST costumam ser mitigadas via *Geo-Block HTTP 403* (ex: Bybit API).
O sistema consolidou o padrão **Hybrid-Fetch** para estas corretoras: uma preempção agressiva aciona as chamadas diretamente pelas propriedades de rede do indivíduo (Client Browser). Falhando no arranjo nativo ou mediante CORS estrito, *auto-fallback* redireciona a requisição por túnel reverso ao Proxy do Node. Isso assegurou que futuras tentativas refatoradas não encerrem sem precedentes a operabilidade em regiões com travas de mercado.

## 2. Segregação de Contextos e Solid (SRP)

### A. Eliminação do Antipadrão "God object" em Sockets
O acoplamento aglomerativo do `useMultiExchangeWS.ts` ruiu frente a criação de intermédios em `src/services/ws/WsParsers.ts`.
Componentes e Hooks do React respiram unicamente sua prioridade mandatória: Vigiá-la frente renderização, injetores e estados na global `Zustand`. Formatações e conversões maçantes dos payloads transcorrem encapsuladamente e sem atrito dentro da _Abstract Class_ estática responsável.

### B. Fim de Gargalos Sequenciais na Rede
O `PositionHistoryService.ts` refutou invocações em *loop* engarrafado (que enfileiravam bloqueios *await* em requisições consecutivas a favor do elegante `Promise.all()`. Uma requisição generalista que consumiria (T1+T2+T3) hoje flui parametrizada e limitada ao peso assíduo retornado apenas do alvo temporariamente mais exausto (*Max(T1, T2, T3)*) poupando recursos drásticos de montagem.

## 3. Disciplina com Padrões Fechados (Specs de Plataforma)

* **Fluxo Circular de Paginação:** Os dados de histórico agora se valem dos índices iterativos recomendados universalmente pelas empresas controladoras (*API Endpoints*). O avanço dinâmico atua nos meta-parâmetros informados, validando explicitamente _Tokens/Cursors_ devolvidos (como os identificadores `nextId` e `nextCursor`), permitindo descargas informativas seguras de grandes proporções nos percusos de 90d (suportadas e exigidas na corretora).
