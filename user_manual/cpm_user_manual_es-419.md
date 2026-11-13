# 📘 Manual de Usuario - Crypto Portfolio Manager (CPM)

> **Versión de la Aplicación:** 2.35.0  
> **Plataformas Soportadas:** Bybit (API V5 UTA), Bitget (API V2 Classic & UTA), OKX (API V5)  
> **Arquitectura de Seguridad:** Zero-Trust Client-Side (Cifrado Web Crypto PBKDF2 + AES-GCM 256-bit)

¡Bienvenido a **Crypto Portfolio Manager (CPM)**! Este terminal analítico institucional ha sido diseñado para consolidar, supervisar y auditar en tiempo real su patrimonio en criptomonedas, posiciones en derivados, riesgos de cobertura Delta-Neutral, tarifas de financiación (funding fees), registros de órdenes e historial contable de transacciones entre los principales exchanges: **Bitget**, **Bybit** y **OKX**.

Nuestra prioridad fundamental es la **seguridad zero-trust** y la **preservación absoluta de su privacidad**: sus claves de API, contraseñas maestras y registros contables permanecen estrictamente bajo la custodia de su navegador local, sin enviarse ni almacenarse jamás en servidores o bases de datos de terceros.

---

## 📌 Tabla de Contenidos

1. [Arquitectura de Seguridad Zero-Trust](#1-arquitectura-de-seguridad-zero-trust)
2. [Configuración Inicial y Claves API](#2-configuración-inicial-y-claves-api)
   - [Configuración Regional y Origen de Bybit](#configuración-regional-y-origen-de-bybit)
   - [Bitget: Selección Classic vs UTA, Subcuentas y Funding](#bitget-selección-classic-vs-uta-subcuentas-y-funding)
   - [OKX: Billetera Dual (Trading y Funding)](#okx-billetera-dual-trading-y-funding)
3. [Contraseña Maestra Global, Copias de Seguridad Cifradas y Bloqueo por Inactividad](#3-contraseña-maestra-global-copias-de-seguridad-cifradas-y-bloqueo-por-inactividad)
4. [Modo de Simulación (Mock Data)](#4-modo-de-simulación-mock-data)
5. [Terminal de Registros Integrado (Connection Logs)](#5-terminal-de-registros-integrado-connection-logs)
6. [Apariencia, Temas, Sincronización y Configuración (Settings)](#6-apariencia-temas-sincronización-y-configuración-settings)
7. [Guía de Pantallas y Uso Diario](#7-guía-de-pantallas-y-uso-diario)
   - [🏠 Panel Principal (Dashboard)](#-panel-principal-dashboard)
   - [⚡ Positions Ticker (Cinta en Tiempo Real)](#-positions-ticker-cinta-en-tiempo-real)
   - [🛡️ Hedge Pro Dashboard (Gestión Delta-Neutral y Contratos Inversos)](#-hedge-pro-dashboard-gestión-delta-neutral-y-contratos-inversos)
   - [💼 Open Positions (Posiciones Activas — Detailed & Lite)](#-open-positions-posiciones-activas--detailed--lite)
   - [📂 Closed Positions (Historial de Posições y Análisis)](#-closed-positions-historial-de-posições-y-análisis)
   - [📝 Reportes de Órdenes (Órdenes Abiertas e Historial de Órdenes)](#-reportes-de-órdenes-órdenes-abiertas-e-historial-de-órdenes)
   - [🔄 Historial de Ejecuciones (Trade History)](#-historial-de-ejecuciones-trade-history)
   - [📜 Historial de Transacciones y Variación Neta Consolidada](#-historial-de-transacciones-y-variación-neta-consolidada)
   - [📊 Rendimiento del Portafolio (Portfolio Performance)](#-rendimiento-del-portafolio-portfolio-performance)
   - [📈 Análisis de Mercado (Market Analytics)](#-análisis-de-mercado-market-analytics)
   - [📊 PnL por Símbolo (PnL by Symbol)](#-pnl-por-símbolo-pnl-by-symbol)
   - [💸 Panel de Tasas de Financiación (Funding Fees)](#-panel-de-tasas-de-financiación-funding-fees)
   - [📑 Reportes (Exportación Ejecutiva)](#-reportes-exportación-ejecutiva)
   - [⚡ Probador de API (API Tester)](#-probador-de-api-api-tester)
   - [👁️ Modo de Privacidad (Privacy Mode)](#-modo-de-privacidad-privacy-mode)
8. [Asistente PIKA (Portfolio Information & Knowledge Assistant)](#8-asistente-pika-portfolio-information--knowledge-assistant)
   - [Principios de Seguridad y Privacidad](#-principios-de-seguridad-y-privacidad)
   - [Proveedores Compatibles y Modelos Locales/Nube](#-proveedores-compatibles-y-modelos-localesnube)
   - [Catálogo de Herramientas Analíticas (7 Herramientas)](#-catálogo-de-herramientas-analíticas-7-herramientas)
   - [Auditoría de Compatibilidad](#-auditoría-de-compatibilidad)
   - [Telemetría Avanzada y Exportación de Registros](#-telemetría-avanzada-y-exportación-de-registros)
   - [Atajo Global y Panel Lateral de Chat](#-atajo-global-y-panel-lateral-de-chat)
9. [Normalización de Contratos Inversos y Precisión Numérica](#9-normalización-de-contratos-inversos-y-precisión-numérica)
10. [Precios Dinámicos de Tokens y Precios de Respaldo](#10-precios-dinámicos-de-tokens-y-precios-de-respaldo)
11. [Resiliencia de Conexión, Fail-Fast y Límite Global de Errores](#11-resiliencia-de-conexión-fail-fast-y-límite-global-de-errores)
12. [Soporte PWA (Instalación en Escritorio y Móvil)](#12-soporte-pwa-instalación-en-escritorio-y-móvil)
13. [Preguntas Frecuentes (FAQ)](#13-preguntas-frecuentes-faq)

---

## 1. Arquitectura de Seguridad Zero-Trust

CPM opera bajo un estricto modelo de descentralización y privacidad:
- **Sin Base de Datos Externa para Credenciales**: No operamos servidores en la nube que almacenen sus claves API o historiales de transacciones. Todas las solicitudes viajan directamente desde su navegador hacia los servidores oficiales de los exchanges.
- **Almacenamiento Cifrado en el Cliente (`localStorage`)**: Sus credenciales residen en el almacenamiento local del navegador, protegidas opcionalmente con cifrado militar (**PBKDF2 con 600,000 iteraciones y AES-GCM 256-bit**).
- **Proxy Local Inerte / Serverless (`server.ts` / `/api/proxy`)**: Para evitar restricciones de CORS del navegador, CPM reenvía el tráfico mediante un proxy ligero que no almacena ni descifra datos. Las firmas criptográficas (HMAC-SHA256) se generan en el cliente antes del envío.
- **NUNCA Ingrese Claves con Permisos de Operación o Retiro**: CPM requiere **exclusivamente permisos de SOLO LECTURA (Read-Only)**.

---

## 2. Configuración Inicial y Claves API

Para conectar sus cuentas reales a CPM:
1. **Genere Claves de Solo Lectura en los Exchanges:**
   - **Bybit**: API V5 (Read-only, permisos para Account, Position y Trade).
   - **OKX**: API V5 (Read-only, requiere **Passphrase** personalizada).
   - **Bitget**: API V2 (Read-only, requiere **Passphrase**; compatible con cuentas Classic y UTA).
2. **Abra el Gestor de Claves**: En la barra lateral, haga clic en **API Keys** y elija **+ Add Exchange**.
3. **Complete el Formulario:**
   - **Exchange**: Seleccione Bitget, Bybit u OKX.
   - **Label**: Nombre identificador único (ej: *Bybit UTA Principal*).
   - **API Key** y **API Secret**.
   - **Passphrase**: Requerido en Bitget y OKX.

### Configuración Regional y Origen de Bybit
- **Environment**: Alternancia entre **Mainnet** (Producción) y **Testnet** (Pruebas).
- **Account Region / Origin**: 15 regiones compatibles: *Global* (`api.bybit.com`), *Bytick* (`api.bytick.com`), *Brazil Standard / Brazil Int* (`x-site-id: BRA_BTL`), *Argentina Standard / Argentina Int* (`x-site-id: ARG_BTL`), *Netherlands* (`api.bybit.nl`), *Turkey* (`api.bybit.tr`), *Kazakhstan* (`api.bybit.kz`), *Georgia* (`api.bybitgeorgia.ge`), *UAE* (`api.bybit.ae`), *EEA* (`api.bybit.eu`), *Indonesia* (`api.bybit.id`), *Japan* (`api.manepa.jp`) y *Hong Kong* (`api.spark-fintech.com` con `x-refer-site-id: HKG`).

---

## 3. Contraseña Maestra Global, Copias de Seguridad Cifradas y Bloqueo por Inactividad

- **Inicialización del Vault**: Al registrar su primera conexión, configure una contraseña maestra (mínimo 8 caracteres) cifrada mediante PBKDF2 y AES-GCM.
- **Pantalla de Bloqueo**: Al reiniciar la página, una pantalla solicita la contraseña para salvaguardar sus datos.
- **Bloqueo Automático (`useVaultAutoLock`)**: Configure un límite de inactividad entre **1 y 60 minutos** en Configuración. Al agotarse, las claves descifradas se eliminan al instante de la memoria RAM.
- **Copias de Seguridad (`.enc`)**: Exporte e importe sus cuentas en un archivo cifrado (`crypto_dashboard_keys_AAAA-MM-DD.enc`) con su contraseña maestra.

---

## 4. Modo de Simulación (Mock Data)

Active **Modo de Simulación** en Configuración para probar la plataforma con datos simulados realistas sin conectar claves reales.

---

## 5. Terminal de Registros Integrado (Connection Logs)

Acceda a **Logs** para supervisar diagnósticos de conexión con filtro automático que oculta cualquier clave o firma HMAC.

---

## 6. Apariencia, Temas, Sincronización y Configuración (Settings)

La pantalla **Settings** agrupa la gobernanza en **10 tarjetas modulares**:
- **Motor Multi-Temas y Tema Customizado**: Alterne entre **Terminal Dark**, **Terminal Light**, **Wise Dark**, **Wise Light** y **Customizado** desde el selector superior (`ThemeModeButton`) o Settings. Personalice **10 tokens de color CSS**, aplique 4 predefiniciones rápidas (*Wise Dark*, *Wise Light*, *Midnight Navy*, *Dracula*) y guarde, cargue o elimine múltiples temas personalizados con nombre propio (acceso directo mediante **Custom design** en el menú superior).
- **Idioma, Monedas Fiat y Diagnóstico API**: Soporte para 6 idiomas y conversión en tiempo real (USD, BRL, EUR, GBP) consultando **Frankfurter API v2** y paridad **USDT/USD** en **CoinGecko**, con TTL configurable (5–60 min) y caché offline.
- **Representación Instantánea (SWR)**: Los datos se cargan desde **IndexedDB** local (14 almacenes, versión 12) mientras los procesos en segundo plano actualizan la información.
- **Retención de Historial**: Periodos configurables de 30 a 730 días con opción de depuración de registros obsoletos.

---

## 7. Guía de Pantallas y Uso Diario

### 🏠 Panel Principal (Dashboard)
- **Patrimonio Total**: Saldo neto consolidado en USD en todos los exchanges conectados.
- **PnL No Realizado**: Ganancia o pérdida flotante de posiciones abiertas.
- **Uso de Margen**: Proporción de margen comprometido frente a colateral disponible.
- **Tabla Jerárquica de Saldos (`ExchangeHierarchyTable`)**: Desglose expandible por Exchange $\to$ Subcuenta $\to$ Activo.

### 🛡️ Hedge Pro Dashboard (Gestión Delta-Neutral y Contratos Inversos)
- Módulo especializado en arbitraje de tasas de financiación y cobertura de capital en contratos inversos (COIN-M).
- **Protección Real**: Las posiciones Short fijan el valor en USD a su `entryPrice`.
- **Barra de Exposición**: Indicador tricolor (% Protegido, % Expuesto, % Apalancamiento).

### 💼 Open Positions (Posiciones Activas — Detailed & Lite)
- Modos detallado y compacto con precio de entrada, precio mark, precio de liquidación, ROE% y apalancamiento.

### 📂 Closed Positions (Historial de Posiciones y Análisis)
- Resumen estadístico de operaciones cerradas (**Win Rate %**, **Profit Factor**) con exportación a **CSV**, **Excel** y **PDF**.

### 📜 Historial de Transacciones y Variación Neta Consolidada
- Cuadro de mando unificado de flujos de caja, funding cobrado/pagado y comisiones de corretaje.

---

## 8. Asistente PIKA (Portfolio Information & Knowledge Assistant)

- **Zero-Trust**: Desactivado por defecto (y configurable con `AI_CHAT_BOT_ENABLED`); sin acceso a claves secretas y con enmascaramiento automático en Modo Privacidad.
- **Solo Lectura**: Análisis consultivo sin permisos de ejecución, con **7 herramientas** (`aiGetPortfolioBalances`, `aiGetOpenPositions`, `aiGetHedgeCorrelationSummary`, `aiGetFundingFeesHistory`, `aiGetMarketFundingRates`, `aiGetTradingFeesHistory`, `aiGetClosedPositionsSummary`).
- **Proveedores**: Ollama local (`llama3.2:latest`), Google Gemini (`gemini-3.8-flash`), OpenRouter, OpenAI, Anthropic y proveedores Custom.
- **Atajo**: Presione **`Ctrl + J`** (o **`Cmd + J`** en macOS) para abrir el asistente.

---

## 9. Normalización de Contratos Inversos y Precisión Numérica

CPM normaliza contratos lineales e inversos a valores unificados en moneda base y USD utilizando la biblioteca matemática de alta precisión **Big.js**.

---

## 10. Precios Dinámicos de Tokens y Precios de Respaldo

Para tokens secundarios sin cotización directa contra USDT, CPM ejecuta consultas de respaldo automáticas para garantizar la valoración exacta del portafolio.

---

## 11. Resiliencia de Conexión, Fail-Fast y Límite Global de Errores

- Detección inmediata de credenciales inválidas para evitar suspensiones de IP por exceso de intentos.
- Límite global de errores en React para restablecer la aplicación con un solo clic.

---

## 12. Soporte PWA (Instalación en Escritorio y Móvil)

Instale CPM como aplicación web progresiva para un acceso rápido y seguro desde su computadora o dispositivo móvil.

---

## 13. Preguntas Frecuentes (FAQ)

### ¿Por qué mi clave de API muestra error de autenticación?
1. Verifique que no existan espacios en blanco accidentales.
2. Compruebe que seleccionó el exchange correspondiente.
3. En Bitget y OKX, introduzca la **Passphrase** correcta.
4. En Bybit, seleccione el dominio regional adecuado si opera en jurisdicciones con regulaciones específicas.

---

*Crypto Portfolio Manager — Conectividad Multi-Exchange Profesional, Análisis Avanzado y Seguridad Zero-Trust.*
