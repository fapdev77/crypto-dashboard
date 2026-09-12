import { BitgetClassicAdapter } from './BitgetClassicAdapter';
import { BitgetUTAAdapter } from './BitgetUTAAdapter';

export { BitgetClassicAdapter, BitgetUTAAdapter };

// Legacy backwards-compatible export
export class BitgetAdapter extends BitgetClassicAdapter {}
