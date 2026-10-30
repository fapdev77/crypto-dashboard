/**
 * SSRF Allowlist Configuration
 * 
 * Consolidated domain allowlist for SSRF prevention across the application.
 * 
 * Previously maintained in two separate locations:
 * - server.ts (25 domains)
 * - /api/proxy.ts (15 domains)
 * 
 * This single source of truth ensures consistent SSRF protection.
 * 
 * Format: lowercase domain strings for case-insensitive comparison.
 * 
 * @see src/utils/ssrfValidator.ts for validation logic
 * @see server.ts for server-side proxy usage
 */

export const SSRF_ALLOWED_DOMAINS = [
  // Bybit exchanges
  'api.bybit.com',
  'api.bytick.com',
  'api-testnet.bybit.com',
  'api.bybit.nl',
  'api.bybit.tr',
  'api.bybit.kz',
  'api.bybitgeorgia.ge',
  'api.bybit.ae',
  'api.bybit.eu',
  'api.bybit.id',

  // Manepa exchanges
  'api.manepa.jp',
  'api-testnet.manepa.jp',

  // Spark Fintech exchanges
  'api.spark-fintech.com',
  'api-testnet.spark-fintech.com',

  // Bitget exchange
  'api.bitget.com',

  // OKX exchanges
  'www.okx.com',
  'api.okx.com',
  'aws.okx.com',

  // Alternative.me (fear & greed index)
  'api.alternative.me',
];

// Export a reusable validation config object for ssrfValidator
export const SSRF_VALIDATION_CONFIG = {
  allowedProtocols: ['https:'],
  allowedDomains: SSRF_ALLOWED_DOMAINS,
};

export { validateSafeUpstreamUrl } from '../utils/ssrfValidator';

// Default export for convenience when used as options parameter
export default SSRF_ALLOWED_DOMAINS;