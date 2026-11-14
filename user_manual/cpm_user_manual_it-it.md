# 📘 Manuale Utente - Crypto Portfolio Manager (CPM)

> **Versione dell'Applicazione:** 2.35.0  
> **Piattaforme Supportate:** Bybit (API V5 UTA), Bitget (API V2 Classic & UTA), OKX (API V5)  
> **Architettura di Sicurezza:** Zero-Trust Client-Side (Crittografia Web Crypto PBKDF2 + AES-GCM 256-bit)

Benvenuto in **Crypto Portfolio Manager (CPM)**! Questo terminale analitico istituzionale è stato progettato per consolidare, monitorare e verificare in tempo reale il tuo patrimonio in criptovalute, le posizioni in derivati, le strategie di copertura delta-neutral, le commissioni di finanziamento (funding rates) e lo storico contabile delle transazioni tra i principali exchange: **Bitget**, **Bybit** e **OKX**.

La nostra priorità fondamentale è la **sicurezza zero-trust** e la **tutela assoluta della privacy**: le chiavi API, le password e lo storico operativo rimangono rigorosamente custoditi nella memoria locale del tuo browser, senza mai transitare né essere memorizzati su server o database di terze parti.

---

## 📌 Indice dei Contenuti

1. [Architettura di Sicurezza Zero-Trust](#1-architettura-di-sicurezza-zero-trust)
2. [Configurazione Iniziale e Chiavi API](#2-configurazione-iniziale-e-chiavi-api)
   - [Configurazioni Regionali e Origine Bybit](#configurazioni-regionali-e-origine-bybit)
   - [Bitget: Selezione Classic vs UTA, Sottoconti e Funding](#bitget-selezione-classic-vs-uta-sottoconti-e-funding)
   - [OKX: Doppio Portafoglio (Trading e Funding)](#okx-doppio-portafoglio-trading-e-funding)
3. [Master Password Globale, Backup Cifrati e Blocco Automatico per Inattività](#3-master-password-globale-backup-cifrati-e-blocco-automatico-per-inattività)
4. [Modalità di Simulazione (Mock Data)](#4-modalità-di-simulazione-mock-data)
5. [Terminale di Log Integrato (Connection Logs)](#5-terminale-di-log-integrato-connection-logs)
6. [Aspetto, Temi, Sincronizzazione e Impostazioni (Settings)](#6-aspetto-temi-sincronizzazione-e-impostazioni-settings)
7. [Guida alle Schermate e Navigazione Quotidiana](#7-guida-alle-schermate-e-navigazione-quotidiana)
   - [🏠 Dashboard Principale](#-dashboard-principale)
   - [⚡ Positions Ticker (Striscia in Tempo Reale)](#-positions-ticker-striscia-in-tempo-reale)
   - [🛡️ Hedge Pro Dashboard (Gestione Delta-Neutral e Contratti Inversi)](#-hedge-pro-dashboard-gestione-delta-neutral-e-contratti-inversi)
   - [💼 Open Positions (Posizioni Attive — Detailed & Lite)](#-open-positions-posizioni-attive--detailed--lite)
   - [📂 Closed Positions (Storico Posizioni e Analisi)](#-closed-positions-storico-posizioni-e-analisi)
   - [📝 Report Ordini (Ordini Aperti e Storico Ordini)](#-report-ordini-ordini-aperti-e-storico-ordini)
   - [🔄 Storico Esecuzioni (Trade History)](#-storico-esecuzioni-trade-history)
   - [📜 Storico Transazioni e Variazione Netta Consolidata](#-storico-transazioni-e-variazione-netta-consolidata)
   - [📊 Performance del Portafoglio (Portfolio Performance)](#-performance-del-portafoglio-portfolio-performance)
   - [📈 Analisi di Mercato (Market Analytics)](#-analisi-di-mercato-market-analytics)
   - [📊 PnL per Simbolo (PnL by Symbol)](#-pnl-per-simbolo-pnl-by-symbol)
   - [💸 Dashboard Tassi di Finanziamento (Funding Fees)](#-dashboard-tassi-di-finanziamento-funding-fees)
   - [📑 Report (Esportazione Gestionale)](#-report-esportazione-gestionale)
   - [⚡ Tester API (API Tester)](#-tester-api-api-tester)
   - [👁️ Modalità Privacy (Privacy Mode)](#-modalità-privacy-privacy-mode)
8. [Assistente PIKA (Portfolio Information & Knowledge Assistant)](#8-assistente-pika-portfolio-information--knowledge-assistant)
   - [Principi di Sicurezza e Riservatezza](#-principi-di-sicurezza-e-riservatezza)
   - [Fornitori Supportati e Modelli Locali/Cloud](#-fornitori-supportati-e-modelli-localicloud)
   - [Catalogo Strumenti Analitici (7 Strumenti)](#-catalogo-strumenti-analitici-7-strumenti)
   - [Verifica Compatibilità Strumenti](#-verifica-compatibilità-strumenti)
   - [Telemetria Avanzata ed Esportazione Log](#-telemetria-avanzata-ed-esportazione-log)
   - [Scorciatoia Globale e Pannello di Chat](#-scorciatoia-globale-e-pannello-di-chat)
9. [Normalizzazione dei Contratti Inversi e Precisione Numerica](#9-normalizzazione-dei-contratti-inversi-e-precisione-numerica)
10. [Prezzi Dinamici dei Token e Prezzi di Riserva](#10-prezzi-dinamici-dei-token-e-prezzi-di-riserva)
11. [Resilienza di Connessione, Fail-Fast e Gestione Globale degli Errori](#11-resilienza-di-connessione-fail-fast-e-gestione-globale-degli-errori)
12. [Supporto PWA (Installazione su Desktop e Mobile)](#12-supporto-pwa-installazione-su-desktop-e-mobile)
13. [Domande Frequenti (FAQ)](#13-domande-frequenti-faq)

---

## 1. Architettura di Sicurezza Zero-Trust

CPM è strutturato secondo un rigoroso paradigma di privacy decentralizzata:
- **Nessun Database Esterno per le Credenziali**: Non operiamo alcun server cloud per conservare chiavi API o registri operativi. Tutte le comunicazioni avvengono direttamente dal tuo browser verso i server ufficiali degli exchange.
- **Archiviazione Cifrata nel Client (`localStorage`)**: Le tue credenziali risiedono nello spazio locale protetto del browser, con crittografia opzionale a standard militare (**PBKDF2 con 600.000 iterazioni e AES-GCM 256-bit**).
- **Proxy Locale Inerte / Serverless (`server.ts` / `/api/proxy`)**: Per superare i blocchi CORS imposti dai browser, CPM instrada le chiamate attraverso un proxy leggero a conoscenza zero. Le firme crittografiche (HMAC-SHA256) sono calcolate nel browser prima dell'invio.
- **NON Utilizzare MAI Chiavi con Permessi di Prelievo o Ordini**: CPM richiede **esclusivamente permessi di SOLA LETTURA (Read-Only)**.

---

## 2. Configurazione Iniziale e Chiavi API

Per connettere i tuoi account reali a CPM:
1. **Genera Chiavi in Sola Lettura sugli Exchange:**
   - **Bybit**: API V5 (Read-only, permessi per Account, Position e Trade).
   - **OKX**: API V5 (Read-only, richiede una **Passphrase** sicura).
   - **Bitget**: API V2 (Read-only, richiede **Passphrase**; supporta sia conti Classic che UTA).
2. **Apri il Gestore Chiavi**: Nella barra laterale, clicca su **API Keys** e seleziona **+ Add Exchange**.
3. **Compila il Modulo:**
   - **Exchange**: Seleziona Bitget, Bybit o OKX.
   - **Label**: Nome univoco per identificare l'account (es: *Bybit UTA Principale*).
   - **API Key** e **API Secret**.
   - **Passphrase**: Obbligatorio per Bitget e OKX.

### Configurazioni Regionali e Origine Bybit
- **Environment**: Alterna tra **Mainnet** (Produzione) e **Testnet** (Simulazione).
- **Account Region / Origin**: 15 regioni supportate: *Global* (`api.bybit.com`), *Bytick* (`api.bytick.com`), *Brazil Standard / Brazil Int* (`x-site-id: BRA_BTL`), *Argentina Standard / Argentina Int* (`x-site-id: ARG_BTL`), *Netherlands* (`api.bybit.nl`), *Turkey* (`api.bybit.tr`), *Kazakhstan* (`api.bybit.kz`), *Georgia* (`api.bybitgeorgia.ge`), *UAE* (`api.bybit.ae`), *EEA* (`api.bybit.eu`), *Indonesia* (`api.bybit.id`), *Japan* (`api.manepa.jp`) e *Hong Kong* (`api.spark-fintech.com` con `x-refer-site-id: HKG`).

---

## 3. Master Password Globale, Backup Cifrati e Blocco Automatico per Inattività

- **Inizializzazione del Vault**: Alla prima configurazione, imposta una master password (minimo 8 caratteri) cifrata con PBKDF2 e AES-GCM.
- **Schermata di Blocco**: All'apertura della pagina, una schermata protetta impedisce la visualizzazione dei dati fino all'inserimento della password corretta.
- **Blocco per Inattività (`useVaultAutoLock`)**: Imposta il timeout tra **1 e 60 minuti** in Impostazioni. Al termine, le chiavi in memoria RAM vengono eliminate istantaneamente.
- **Backup Cifrati (`.enc`)**: Esporta e importa l'intera configurazione in un file cifrato (`crypto_dashboard_keys_AAAA-MM-GG.enc`) protetto dalla tua master password.

---

## 4. Modalità di Simulazione (Mock Data)

Attiva la **Modalità di Simulazione** in Impostazioni per testare tutte le funzionalità con dati simulati realistici senza collegare chiavi reali.

---

## 5. Terminale di Log Integrato (Connection Logs)

Accedi a **Logs** per diagnosticare la connettività di rete. Un filtro automatico nasconde qualsiasi informazione sensibile (chiavi API, passphrase, firme HMAC).

---

## 6. Aspetto, Temi, Sincronizzazione e Impostazioni (Settings)

La pagina **Settings** organizza la configurazione in **10 schede modulari**:
- **Motore Multi-Tema e Tema Personalizzato**: Passa da **Terminal Dark**, **Terminal Light**, **Wise Dark**, **Wise Light** e **Custom** tramite il selettore nell'intestazione (`ThemeModeButton`) o nelle Impostazioni. Personalizza **10 token di colore CSS**, applica 4 preset rapidi (*Wise Dark*, *Wise Light*, *Midnight Navy*, *Dracula*) e salva, carica o elimina temi personalizzati nominati (con accesso rapido tramite **Custom design** nel menu superiore).
- **Lingua, Valute Fiat e Diagnostica API**: Supporto per 6 lingue e conversione in tempo reale (USD, BRL, EUR, GBP) tramite **Frankfurter API v2** e tasso **USDT/USD** da **CoinGecko**, con TTL configurabile (5–60 min) e cache offline.
- **Caricamento Istantaneo (SWR)**: Tabelle e grafici caricano subito dalla cache **IndexedDB** (14 store, v12), mentre i worker in background aggiornano i record recenti.
- **Conservazione Storico**: Periodi selezionabili da 30 a 730 giorni con rimozione dei dati più datati.

---

## 7. Guida alle Schermate e Navigazione Quotidiana

### 🏠 Dashboard Principale
- **Patrimonio Totale**: Saldo netto aggregato in USD su tutti gli exchange connessi.
- **PnL Non Realizzato**: Utile/perdita fluttuante sulle posizioni aperte in derivati.
- **Margine Utilizzato**: Rapporto tra margine impegnato e collaterale libero.
- **Tabella Gerarchica dei Saldi (`ExchangeHierarchyTable`)**: Ripartizione dettagliata Exchange $\to$ Sottoconto $\to$ Asset.

### 🛡️ Hedge Pro Dashboard (Gestione Delta-Neutral e Contratti Inversi)
- Modulo dedicato all'arbitraggio dei tassi di finanziamento e alla copertura del rischio.
- **Protezione Reale**: Le posizioni Short sui contratti inversi bloccano il controvalore in USD a `entryPrice`.
- **Indicatore di Esposizione**: Barra grafica tricolore (% Protetto, % Esposto, % Leva).

### 💼 Open Positions (Posizioni Attive — Detailed & Lite)
- Visualizzazione dettagliata o compatta con prezzo di ingresso, mark price, prezzo di liquidazione e avvisi di rischio.

### 📂 Closed Positions (Storico Posizioni e Analisi)
- Riepilogo delle posizioni chiuse con **Win Rate %**, **Profit Factor** ed esportazione in **CSV**, **Excel** e **PDF**.

### 📜 Storico Transazioni e Variazione Netta Consolidata
- Riepilogo consolidato di flussi di cassa, commissioni di negoziazione e accrediti di funding.

---

## 8. Assistente PIKA (Portfolio Information & Knowledge Assistant)

- **Zero-Trust**: Disabilitato per impostazione predefinita (controllabile con `AI_CHAT_BOT_ENABLED`); nessun accesso alle credenziali riservate e offuscamento automatico in Modalità Privacy.
- **Sola Lettura**: Analisi consultiva priva di permessi operativi con **7 strumenti** (`aiGetPortfolioBalances`, `aiGetOpenPositions`, `aiGetHedgeCorrelationSummary`, `aiGetFundingFeesHistory`, `aiGetMarketFundingRates`, `aiGetTradingFeesHistory`, `aiGetClosedPositionsSummary`).
- **Fornitori Supportati**: Ollama locale (`llama3.2:latest`), Google Gemini (`gemini-3.8-flash`), OpenRouter, OpenAI, Anthropic e provider Custom.
- **Scorciatoia**: Premi **`Ctrl + J`** (o **`Cmd + J`** su macOS) per aprire l'assistente.

---

## 9. Normalizzazione dei Contratti Inversi e Precisione Numerica

CPM normalizza i contratti lineari e inversi alle rispettive quantità in moneta base e USD utilizzando la libreria ad alta precisione **Big.js**.

---

## 10. Prezzi Dinamici dei Token e Prezzi di Riserva

Per token secondari senza quotazione diretta contro USDT, CPM esegue richieste di riserva automatiche per garantire la corretta valorizzazione del portafoglio.

---

## 11. Resilienza di Connessione, Fail-Fast e Gestione Globale degli Errori

- Riconoscimento rapido degli errori di credenziali per evitare blocchi temporanei dell'indirizzo IP.
- Schermata di ripristino sicuro in React in caso di eccezioni impreviste.

---

## 12. Supporto PWA (Installazione su Desktop e Mobile)

Installa CPM come Progressive Web App direttamente dal browser per un'esperienza nativa e avvio rapido.

---

## 13. Domande Frequenti (FAQ)

### La mia chiave API non si connette. Cosa devo verificare?
1. Controlla che non vi siano spazi vuoti all'inizio o alla fine.
2. Verifica di aver selezionato l'exchange corretto.
3. Su Bitget e OKX, inserisci la **Passphrase** impostata in fase di creazione della chiave.
4. Su Bybit, seleziona la regione corretta se ti trovi in una giurisdizione regolamentata.

---

*Crypto Portfolio Manager — Connettività Multi-Exchange Professionale, Analisi Avanzata e Sicurezza Zero-Trust.*
