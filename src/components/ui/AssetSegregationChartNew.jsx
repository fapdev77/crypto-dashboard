import React, { useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Legend,
    Cell,
} from 'recharts';

const mockData = [
    {
        id: 1,
        name: 'Bybit',
        exchangePct: 25,
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
        exchangePct: 30,
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
    {
        id: 4,
        name: 'Binance',
        exchangePct: 20,
        totalAmount: 2500000,
        assets: [
            { token: 'BTC', pct: 20, color: '#f7931a' },
            { token: 'ETH', pct: 20, color: '#3b82f6' },
            { token: 'SOL', pct: 25, color: '#10b981' },
            { token: 'NVDA', pct: 20, color: '#a855f7' },
            { token: 'Others', pct: 15, color: '#14b8a6' },
        ],
    },
];

const assetKeys = ['BTC', 'ETH', 'SOL', 'NVDA', 'Others'];
const assetColors = {
    BTC: '#f7931a',
    ETH: '#3b82f6',
    SOL: '#10b981',
    NVDA: '#a855f7',
    Others: '#14b8a6',
};
const exchangeOutline = {
    Bybit: 'border-[#f7a600]',
    Bitget: 'border-[#00bcd4]',
    Okx: 'border-[#10b981]',
    Binance: 'border-[#f59e0b]',
};

function CustomTooltip({ active, payload, label }) {
    if (!active || !payload || !payload.length) {
        return null;
    }

    return (
        <div className="rounded-2xl bg-slate-950 border border-slate-700 p-3 text-sm text-slate-100 shadow-2xl">
            <div className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-400">{label}</div>
            {payload.map((entry) => (
                <div key={entry.dataKey} className="flex items-center justify-between gap-3 py-1">
                    <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span>{entry.dataKey}</span>
                    </div>
                    <span className="font-semibold">{entry.value}%</span>
                </div>
            ))}
            <div className="mt-2 border-t border-slate-800 pt-2 text-xs text-slate-400">
                Total equity: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(mockData.find((item) => item.name === label)?.totalAmount || 0)}
            </div>
        </div>
    );
}

export default function AssetSegregationChartNew() {
    const chartData = useMemo(
        () =>
            mockData.map((exchange) => ({
                exchange: exchange.name,
                exchangePct: exchange.exchangePct,
                totalAmount: exchange.totalAmount,
                ...exchange.assets.reduce((acc, asset) => {
                    acc[asset.token] = asset.pct;
                    return acc;
                }, {}),
            })),
        []
    );

    const totalEquity = useMemo(
        () => mockData.reduce((sum, row) => sum + row.totalAmount, 0),
        []
    );

    return (
        <div className="w-full max-w-5xl min-w-0 rounded-3xl border border-[#1f2937] bg-[#0b0f19] p-6 shadow-2xl text-slate-200">
            <h2 className="text-lg font-semibold text-white mb-5 tracking-wide">Macro Capital Distribution & Asset Composition</h2>

            <div className="h-[320px] min-h-[320px] min-w-0 w-full rounded-3xl border border-slate-800 bg-[#07111f] p-3 overflow-hidden">
                <BarChart
                    width={680}
                    height={320}
                    layout="vertical"
                    data={chartData}
                    margin={{ top: 16, right: 24, left: 12, bottom: 16 }}
                >
                    <CartesianGrid stroke="#1f2937" vertical={false} strokeDasharray="4 4" />
                    <XAxis
                        type="number"
                        domain={[0, 100]}
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        unit="%"
                    />
                    <YAxis
                        type="category"
                        dataKey="exchange"
                        width={90}
                        tick={{ fill: '#e2e8f0', fontSize: 13, fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.06)' }} />
                    <Legend wrapperStyle={{ paddingTop: 8, fontSize: 12 }} />

                    {assetKeys.map((key) => (
                        <Bar key={key} dataKey={key} stackId="a" fill={assetColors[key]} radius={[8, 8, 8, 8]}>
                            {chartData.map((entry) => (
                                <Cell key={`${entry.exchange}-${key}`} fill={assetColors[key]} />
                            ))}
                        </Bar>
                    ))}
                </BarChart>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {mockData.map((exchange) => (
                    <div
                        key={exchange.id}
                        className={`rounded-3xl border bg-[#0f1114] p-4 text-sm shadow-inner ${exchangeOutline[exchange.name] || 'border-slate-800'}`}
                    >
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <div className="font-semibold text-white">{exchange.name}</div>
                                <div className="text-xs text-slate-400">{exchange.exchangePct}% of equity</div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-semibold text-white">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(exchange.totalAmount)}</div>
                                <div className="text-[11px] text-slate-400">{exchange.exchangePct}%</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 border-t border-slate-800 pt-5 text-center">
                <div className="text-sm font-medium text-slate-400">Total Equity (USD)</div>
                <div className="text-3xl md:text-4xl font-bold text-white mt-2 font-mono">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalEquity)}
                </div>
            </div>
        </div>
    );
}
