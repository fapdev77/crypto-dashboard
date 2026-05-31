import React, { useState, useEffect } from 'react';
import { Search, Info, CheckCircle2, Loader2, AlertCircle, TrendingUp, Building2, CircleDollarSign } from 'lucide-react';
import { AssetClassifierAggregator } from '../services/AssetClassifierAggregator';
import { UnifiedAssetCategory } from '../types';
import { formatAssetAmount } from '../utils/formatters';
import { CoinIcon } from './ui/CoinIcon';

interface SearchResult {
  symbol: string;
  category: UnifiedAssetCategory;
  source: string;
  elapsedMs: number;
}

const TOP_CRYPTO = [
  { sym: 'BTC', name: 'Bitcoin', val: '64230.5012' },
  { sym: 'ETH', name: 'Ethereum', val: '3450.1250' },
  { sym: 'SOL', name: 'Solana', val: '145.8090' },
  { sym: 'XRP', name: 'Ripple', val: '0.4820' },
  { sym: 'ADA', name: 'Cardano', val: '0.4123' },
  { sym: 'DOGE', name: 'Dogecoin', val: '0.1299' },
  { sym: 'TRX', name: 'TRON', val: '0.1190' },
  { sym: 'AVAX', name: 'Avalanche', val: '27.400' },
  { sym: 'DOT', name: 'Polkadot', val: '6.205' },
  { sym: 'LINK', name: 'Chainlink', val: '14.120' },
];

const TOP_STOCKS = [
  { sym: 'NVDA', name: 'Nvidia Corp', val: '120.5510' },
  { sym: 'AAPL', name: 'Apple Inc', val: '210.2060' },
  { sym: 'MSFT', name: 'Microsoft', val: '415.8030' },
  { sym: 'TSLA', name: 'Tesla Inc', val: '198.4020' },
  { sym: 'AMZN', name: 'Amazon', val: '189.9070' },
  { sym: 'META', name: 'Meta Platforms', val: '502.100' },
  { sym: 'GOOGL', name: 'Alphabet', val: '185.300' },
  { sym: 'MSTR', name: 'MicroStrategy', val: '1405.10' },
  { sym: 'COIN', name: 'Coinbase', val: '230.12' },
  { sym: 'AMD', name: 'AMD', val: '160.25' },
];

const TOP_STABLES = [
  { sym: 'USDT', name: 'Tether USD', val: '1.0001' },
  { sym: 'USDC', name: 'USD Coin', val: '0.9999' },
  { sym: 'DAI', name: 'Dai Stablecoin', val: '1.0005' },
  { sym: 'FDUSD', name: 'First Digital', val: '1.0000' },
  { sym: 'USDE', name: 'Ethena USDe', val: '1.0000' }
];

export function AssetMetadataPlayground() {
  const [symbol, setSymbol] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [testAmount, setTestAmount] = useState('100.12345678');
  const [classifications, setClassifications] = useState<Record<string, UnifiedAssetCategory>>({});

  useEffect(() => {
     // Pre-load classifications for mock lists
     const allAssets = [...TOP_CRYPTO, ...TOP_STOCKS, ...TOP_STABLES].map(a => a.sym);
     allAssets.forEach(sym => {
         AssetClassifierAggregator.getGlobalAssetCategory(sym).then(cat => {
            setClassifications(prev => ({ ...prev, [sym]: cat }));
         });
     });
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim()) return;

    setIsLoading(true);
    setResult(null);
    setError(null);

    const start = performance.now();
    try {
       const details = await AssetClassifierAggregator.getGlobalAssetDetails(symbol.trim().toUpperCase());
       const end = performance.now();
       
       setResult({
           symbol: symbol.trim().toUpperCase(),
           category: details.category,
           source: details.source,
           elapsedMs: Math.round(end - start)
       });
    } catch (err: any) {
       setError(err.message || 'Error occurred');
    } finally {
       setIsLoading(false);
    }
  };

  const AssetRow = ({ item, icon: Icon, colorClass }: { item: any, icon: any, colorClass: string }) => {
      const cat = classifications[item.sym];
      return (
          <div className="flex justify-between items-center py-3 border-b border-[#2a2b30]/40 last:border-0 hover:bg-[#2a2b30]/20 px-3 -mx-3 rounded-lg transition-colors">
              <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10 border border-current border-opacity-20`}>
                      <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                      <span className="text-white font-medium text-sm">{item.sym}</span>
                      <span className="text-[#8E9299] text-xs max-w-[100px] truncate">{item.name}</span>
                  </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                  <span className="text-white font-mono text-sm">
                      ${cat ? formatAssetAmount(item.val, cat) : <span className="animate-pulse text-purple-400/50">...</span>}
                  </span>
                  {cat && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                          cat === 'STOCK' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 
                          'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                      }`}>
                          {cat}
                      </span>
                  )}
              </div>
          </div>
      );
  };

  return (
    <div className="max-w-6xl space-y-6">
      
      {/* Search Header Config */}
      <div className="bg-[#151619] border border-[#2a2b30] rounded-xl overflow-hidden">
         <div className="bg-gradient-to-r from-purple-900/20 to-transparent p-6 border-b border-[#2a2b30]">
             <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <Info className="w-5 h-5 text-purple-400" />
                Global Asset Classifier
             </h2>
             <p className="text-[#8E9299] text-sm">
               Busca informações dinâmicas sobre ativos (ex: BTC, NVDA, USDT) para classificação. 
               O motor de resolução validará a categorização seguindo a hierarquia nativa sem o uso de listas estruturadas: 
               <br/><strong className="text-white font-mono mt-1 inline-block">1° OKX &nbsp;➔&nbsp; 2° Bybit &nbsp;➔&nbsp; 3° Bitget</strong>
             </p>
         </div>

         <div className="p-6">
             <form onSubmit={handleSearch} className="flex gap-4 items-end">
               <div className="flex-1">
                  <label className="block text-xs font-medium text-[#8E9299] mb-1">Asset Symbol</label>
                  <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                         <Search className="w-4 h-4 text-[#8E9299]" />
                      </div>
                      <input
                        type="text"
                        value={symbol}
                        onChange={e => setSymbol(e.target.value)}
                        placeholder="e.g. NVDA, SOL, AAPL"
                        className="w-full bg-[#1e1f23] border border-[#2a2b30] text-white rounded-lg pl-10 pr-4 py-3 uppercase focus:outline-none focus:border-purple-500 transition-colors placeholder:normal-case placeholder:text-[#4B4E54]"
                      />
                  </div>
               </div>
               <button
                 type="submit"
                 disabled={isLoading || !symbol}
                 className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-8 py-3 rounded-lg font-medium transition-colors h-12"
               >
                 {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Classify'}
               </button>
             </form>

             {error && (
                 <div className="mt-6 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-center gap-3">
                    <AlertCircle className="w-5 h-5" />
                    <span>{error}</span>
                 </div>
             )}

             {result && (
               <div className="mt-6 bg-[#1e1f23] rounded-lg border border-[#2a2b30] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="bg-[#2a2b30]/30 px-4 py-3 border-b border-[#2a2b30] flex justify-between items-center">
                      <h3 className="font-medium text-white flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                          Evaluation Result
                      </h3>
                      <span className="text-xs text-[#8E9299]">Cross-exchange latency: {result.elapsedMs}ms</span>
                  </div>
                  
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div>
                        <div className="text-xs text-[#8E9299] mb-4 uppercase tracking-wider font-semibold">Identified Context</div>
                        <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-center py-2 border-b border-[#2a2b30]/50">
                                <span className="text-[#8E9299]">Symbol</span>
                                <div className="flex items-center gap-2">
                                    <CoinIcon 
                                      symbol={result.symbol} 
                                      category={result.category} 
                                      name={[...TOP_CRYPTO, ...TOP_STOCKS, ...TOP_STABLES].find(x => x.sym === result.symbol)?.name}
                                      className="w-6 h-6" 
                                    />
                                    <span className="text-white font-mono font-medium">{result.symbol}</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-[#2a2b30]/50">
                                <span className="text-[#8E9299]">System Description</span>
                                <span className="text-white text-sm text-right">
                                    {[...TOP_CRYPTO, ...TOP_STOCKS, ...TOP_STABLES].find(x => x.sym === result.symbol)?.name || `Global ${result.category} Asset`}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-[#2a2b30]/50">
                                <span className="text-[#8E9299]">Identified By</span>
                                <span className="text-white font-mono text-xs bg-[#2a2b30] px-2 py-0.5 rounded">{result.source}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 mt-1">
                                <span className="text-white font-medium">Resolution Category</span>
                                <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                                    result.category === 'STOCK' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 
                                    'bg-orange-500/20 text-orange-400 border border-orange-500/30' 
                                }`}>
                                    {result.category}
                                </span>
                            </div>
                        </div>
                     </div>

                     <div>
                        <div className="text-xs text-[#8E9299] mb-4 uppercase tracking-wider font-semibold">Formatter Precision Output</div>
                        <div className="bg-[#151619] border border-[#2a2b30] rounded-lg p-4">
                            <label className="block text-xs font-medium text-[#8E9299] mb-2">Test Amount</label>
                            <input 
                               type="text" 
                               value={testAmount}
                               onChange={e => setTestAmount(e.target.value)}
                               className="w-full bg-[#1e1f23] border border-[#2a2b30] text-white rounded p-2 mb-4 font-mono text-sm focus:outline-none focus:border-purple-500"
                            />
                            
                            <div className="flex justify-between items-end pt-3 border-t border-[#2a2b30]">
                                <span className="text-[#8E9299] text-xs">Generated Display:</span>
                                <div className="text-2xl text-white font-mono font-medium">
                                    ${formatAssetAmount(testAmount, result.category)}
                                </div>
                            </div>
                        </div>
                     </div>
                  </div>
               </div>
             )}
         </div>
      </div>

      {/* Bento Grid: Leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-6 flex flex-col">
              <h3 className="text-md font-bold text-white mb-6 flex items-center gap-2">
                 <Building2 className="w-5 h-5 text-blue-400" />
                 Tokenized Stocks
              </h3>
              <div className="flex-1">
                  {TOP_STOCKS.map(item => (
                      <AssetRow key={item.sym} item={item} icon={Building2} colorClass="text-blue-400" />
                  ))}
              </div>
          </div>

          <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-6 flex flex-col">
              <h3 className="text-md font-bold text-white mb-6 flex items-center gap-2">
                 <TrendingUp className="w-5 h-5 text-orange-400" />
                 Crypto Core
              </h3>
              <div className="flex-1">
                  {TOP_CRYPTO.map(item => (
                      <AssetRow key={item.sym} item={item} icon={TrendingUp} colorClass="text-orange-400" />
                  ))}
              </div>
          </div>

          <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-6 flex flex-col">
              <h3 className="text-md font-bold text-white mb-6 flex items-center gap-2">
                 <CircleDollarSign className="w-5 h-5 text-[#00C853]" />
                 Stablecoins
              </h3>
              <div className="flex-1">
                  {TOP_STABLES.map(item => (
                      <AssetRow key={item.sym} item={item} icon={CircleDollarSign} colorClass="text-[#00C853]" />
                  ))}
              </div>
          </div>
      </div>

    </div>
  );
}
