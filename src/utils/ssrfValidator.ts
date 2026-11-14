/**
 * SSRF Prevention Validator
 * Protects server-side endpoints from Server-Side Request Forgery while supporting
 * local network (LAN) instances for services like Ollama.
 */

export interface UrlValidationOptions {
  allowedProtocols?: string[];
  allowLanIps?: boolean;
  allowedDomains?: string[];
  blockedPorts?: number[];
  extraAllowedHosts?: string[];
}

const DEFAULT_BLOCKED_PORTS = [
  21,    // FTP
  22,    // SSH
  23,    // Telnet
  25,    // SMTP
  53,    // DNS
  110,   // POP3
  135,   // RPC
  137,   // NetBIOS
  138,   // NetBIOS
  139,   // NetBIOS
  445,   // SMB
  1433,  // MSSQL
  1521,  // Oracle
  2375,  // Docker daemon unencrypted
  2376,  // Docker daemon TLS
  3306,  // MySQL
  3389,  // RDP
  5432,  // PostgreSQL
  6379,  // Redis
  11211, // Memcached
  27017, // MongoDB
  28017, // MongoDB Web
];

const CLOUD_METADATA_HOSTS = [
  '169.254.169.254',
  '169.254.170.2',
  'metadata.google.internal',
  'metadata.local',
  'fd00:ec2::254',
];

/**
 * Checks if a given hostname or IP is a known cloud metadata endpoint.
 */
export function isCloudMetadata(hostname: string): boolean {
  const lower = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (CLOUD_METADATA_HOSTS.includes(lower)) return true;
  if (lower.startsWith('169.254.')) return true;
  if (lower.startsWith('fe80:')) return true;
  if (lower.includes('metadata.google')) return true;
  return false;
}

/**
 * Checks if a hostname or IP is a loopback or private local network address (RFC 1918 / mDNS).
 */
export function isPrivateOrLocalIp(hostname: string): boolean {
  const lower = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (lower === 'localhost' || lower === '127.0.0.1' || lower === '::1') return true;
  if (lower.endsWith('.local')) return true;
  // Single-label hostname on private LAN (e.g. "homeserver", "ollama-pc")
  if (!lower.includes('.') && !lower.includes(':')) return true;

  const ipv4Match = lower.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const oct1 = parseInt(ipv4Match[1], 10);
    const oct2 = parseInt(ipv4Match[2], 10);
    // 10.0.0.0/8
    if (oct1 === 10) return true;
    // 172.16.0.0/12 (172.16.0.0 to 172.31.255.255)
    if (oct1 === 172 && oct2 >= 16 && oct2 <= 31) return true;
    // 192.168.0.0/16
    if (oct1 === 192 && oct2 === 168) return true;
    // 127.0.0.0/8
    if (oct1 === 127) return true;
  }

  return false;
}

/**
 * Validates a target URL against SSRF vulnerabilities.
 */
export function validateSafeUpstreamUrl(
  targetUrl: string,
  options: UrlValidationOptions = {}
): { isValid: boolean; reason?: string; url?: URL } {
  if (!targetUrl || typeof targetUrl !== 'string') {
    return { isValid: false, reason: 'Empty or invalid URL string' };
  }

  let urlObj: URL;
  try {
    urlObj = new URL(targetUrl);
  } catch {
    return { isValid: false, reason: 'Malformed URL' };
  }

  // 1. Protocol check
  const allowedProtocols = options.allowedProtocols || ['http:', 'https:'];
  if (!allowedProtocols.includes(urlObj.protocol)) {
    return {
      isValid: false,
      reason: `Forbidden protocol: ${urlObj.protocol}. Allowed: ${allowedProtocols.join(', ')}`,
    };
  }

  // 2. Reject credentials in URL
  if (urlObj.username || urlObj.password) {
    return { isValid: false, reason: 'URLs with embedded userinfo credentials are not permitted' };
  }

  const hostname = urlObj.hostname.toLowerCase().replace(/^\[|\]$/g, '');

  // 3. Absolute block on cloud metadata
  if (isCloudMetadata(hostname)) {
    return { isValid: false, reason: 'Access to cloud metadata services is strictly forbidden' };
  }

  // 4. Port validation
  const port = urlObj.port ? parseInt(urlObj.port, 10) : (urlObj.protocol === 'https:' ? 443 : 80);
  const blockedPorts = options.blockedPorts || DEFAULT_BLOCKED_PORTS;
  if (blockedPorts.includes(port)) {
    return { isValid: false, reason: `Access to restricted port ${port} is blocked` };
  }

  // 5. Environment override / extra allowed hosts
  const envAllowed = (process.env.OLLAMA_ALLOWED_HOSTS || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  const extraAllowed = (options.extraAllowedHosts || []).map((h) => h.toLowerCase());
  const allAllowedHosts = [...envAllowed, ...extraAllowed];

  if (allAllowedHosts.includes(hostname)) {
    return { isValid: true, url: urlObj };
  }

  // 6. LAN / Local private networks validation
  const isLocal = isPrivateOrLocalIp(hostname);
  if (options.allowLanIps && isLocal) {
    return { isValid: true, url: urlObj };
  }

  // 7. Domain Allowlist validation
  if (options.allowedDomains && options.allowedDomains.length > 0) {
    const normalizedAllowed = options.allowedDomains.map((d) => d.toLowerCase());
    if (normalizedAllowed.includes(hostname)) {
      return { isValid: true, url: urlObj };
    }
    return {
      isValid: false,
      reason: `Hostname ${hostname} is not in the allowed domains list`,
    };
  }

  // If allowLanIps was false and isLocal was true
  if (!options.allowLanIps && isLocal) {
    return { isValid: false, reason: `Private local address ${hostname} is not permitted for this endpoint` };
  }

  return { isValid: true, url: urlObj };
}
