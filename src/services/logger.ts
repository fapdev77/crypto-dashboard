import { LogManager } from './LogManager';

/**
 * @deprecated Use LogManager directly instead of console monkey-patching.
 *             The old initializeLogger() is kept as a no-op for backward compatibility.
 */
export function initializeLogger() {
  // No-op: LogManager is self-contained and does not monkey-patch console.
  // Remove this call from main.tsx when convenient.
}

export { LogManager };
