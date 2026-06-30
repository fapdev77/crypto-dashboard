import React from 'react';

const mockData = [
    {
        id: 1,
        name: 'Bybit',
        exchangePct: 35,
        totalAmount: 4200000,
        assets: [
            { token: 'BTC', pct: 35, color: '#f7931a' },
            { token: 'ETH', pct: 25, color: '#3b82f6' },
            { token: 'SOL', pct: 15, color: '#10b981' },
            { token: 'NVDA', pct: 10, color: '#a855f7' },
            { token: 'Others', pct: 15, color: '#14b8a6' },
        ],
    },
    {
        id: 2,
        name: 'Bitget',
        exchangePct: 40,
        totalAmount: 4800000,
        assets: [
            { token: 'BTC', pct: 30, color: '#f7931a' },
            { token: 'ETH', pct: 30, color: '#3b82f6' },
            { token: 'SOL', pct: 10, color: '#10b981' },
            { token: 'NVDA', pct: 10, color: '#a855f7' },
            { token: 'Others', pct: 20, color: '#14b8a6' },
        ],
    },
    {
        id: 3,
        name: 'Okx',
        exchangePct: 25,
        totalAmount: 3000000,
        assets: [
            { token: 'BTC', pct: 25, color: '#f7931a' },
            { token: 'ETH', pct: 25, color: '#3b82f6' },
            { token: 'SOL', pct: 20, color: '#10b981' },
            { token: 'NVDA', pct: 15, color: '#a855f7' },
            { token: 'Others', pct: 15, color: '#14b8a6' },
        ],
    },
];

const exchangeOutline = {
    Bybit: 'border-[#ff9c2e] ring-[#ff9c2e]/20',
    Bitget: 'border-[#03aac7] ring-[#03aac7]/20',
    Okx: 'border-[#fafafa] ring-[#fafafa]/20',
};

export default function AssetSegregationChart() {
    const totalEquity = mockData.reduce((s, e) => s + e.totalAmount, 0);

    return (
        <div className="w-full max-w-5xl bg-[#0b0f19] text-slate-200 p-6 rounded-2xl font-sans shadow-2xl border border-[#1f2937] select-none">
            <h2 className="text-lg font-semibold text-white mb-6 tracking-wide">Macro Capital Distribution & Asset Composition</h2>

            <div className="space-y-4 relative">
                <div className="absolute left-[108px] top-6 bottom-6 w-[1px] bg-slate-800/40" />

                {mockData.map((exchange) => (
                    <div key={exchange.id} className="grid grid-cols-[120px_1fr_120px] items-center gap-4 min-w-0">
                        {/* Left box */}
                        <div className="w-[120px]">
                            <div className={`bg-[#0f1114] border rounded-xl px-3 py-3 h-14 flex flex-col justify-center border-2 ${exchangeOutline[exchange.name] || 'border-[#2a2b30]'}`}>
                                <span className="text-sm font-semibold text-white leading-tight">{exchange.name}</span>
                                <span className="text-xs text-[#8E9299] font-medium mt-1">{exchange.exchangePct}%</span>
                            </div>
                        </div>

                        {/* Stacked bar */}
                        <div className="w-full min-w-0">
                            <div className="h-12 flex w-full rounded-2xl overflow-hidden border border-[#2a2b30] shadow-inner">
                                {exchange.assets.map((asset, i) => {
                                    const isFirst = i === 0;
                                    const isLast = i === exchange.assets.length - 1;
                                    return (
                                        <div
                                            key={asset.token}
                                            style={{ width: `${asset.pct}%`, backgroundColor: asset.color }}
                                            className={`h-full flex items-center justify-center shrink-0 px-1 min-w-0 ${isFirst ? 'rounded-l-2xl' : ''} ${isLast ? 'rounded-r-2xl' : ''}`}
                                        >
                                            <div className="flex flex-col items-center justify-center px-1 py-1 min-w-0">
                                                <span className="text-[10px] font-semibold text-white leading-tight truncate max-w-full">{asset.token}</span>
                                                <span className="text-[9px] text-white/90 mt-0.5 truncate max-w-full">{asset.pct}%</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Right box */}
                        <div className="flex items-center justify-end min-w-0">
                            <div className={`px-3 py-2 rounded-xl bg-[#0f1114] border-2 ${exchangeOutline[exchange.name] || 'border-[#2a2b30]'} text-right shadow-sm w-full max-w-[120px]`}>
                                <div className="text-sm font-medium text-[#8E9299] truncate">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(exchange.totalAmount)}</div>
                                <div className="text-xs font-bold text-white mt-1">{exchange.exchangePct}%</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 border-t border-[#2a2b30] pt-6 text-center">
                <div className="text-sm text-[#8E9299] font-medium">Total Equity (USD)</div>
                <div className="text-3xl md:text-4xl font-bold font-mono text-white mt-2">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalEquity)}</div>
            </div>
        </div>
    );
}
