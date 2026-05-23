import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

// Mock de dados completo para testar a distribuição de cores e divisões
const data = [
    { name: 'BTC', value: 35, color: '#f7931a' },
    { name: 'ETH', value: 25, color: '#3b82f6' },
    { name: 'SOL', value: 15, color: '#10b981' },
    { name: 'NVDA', value: 10, color: '#a855f7' },
    { name: 'Others', value: 15, color: '#14b8a6' },
];

export default function PieTest() {
    return (
        <div className="w-full max-w-md bg-[#0b0f19] text-slate-200 p-6 rounded-2xl border border-slate-800/40 shadow-2xl select-none">

            {/* Título do Card */}
            <h3 className="text-sm font-semibold text-slate-400 tracking-wider uppercase mb-4">
                Asset Allocation
            </h3>

            {/* 
        Ajuste do Quadro: Alterando a classe h-[350px] você controla 
        a altura total da área física disponível para o Donut se expandir.
      */}
            <div className="w-full h-[350px] flex items-center justify-center relative">

                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"

                            // 1. ESPESSURA DO ANEL E EXPANSÃO NO QUADRO
                            // Proporções agressivas de % fazem o Donut usar quase todo o espaço da div de 350px
                            innerRadius="68%"  // Raio Interno (Espessura interna do Donut)
                            outerRadius="92%"  // Raio Externo (Borda de expansão limite do Donut)

                            // 2. GROSSURA E ESPAÇAMENTO DAS DIVISÕES (GAPS)
                            paddingAngle={4}            // Separação angular das fatias
                            stroke="#0b0f19"            // Cor da borda IDÊNTICA ao bg para criar o corte visual nítido
                            strokeWidth={6}             // Grossura física da divisão (Aumente aqui para separar mais)

                            // 3. CANTOS ARREDONDADOS (Acabamento moderno nas pontas cortadas)
                            cornerRadius={4}

                            startAngle={90}             // Rotaciona o início do gráfico para o topo (opcional)
                            endAngle={-270}
                        >
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.color}
                                    className="transition-all duration-300 hover:opacity-80 outline-none cursor-pointer"
                                />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>

                {/* Texto Centralizado Flutuante (Efeito Donut Premium) */}
                <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                        Portfolio
                    </span>
                    <span className="text-2xl font-extrabold text-white mt-1">
                        100%
                    </span>
                </div>

            </div>

            {/* Legenda customizada para validar o mapeamento */}
            <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-slate-800/50">
                {data.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-xs font-semibold text-slate-300 whitespace-nowrap">
                            {item.name} ({item.value}%)
                        </span>
                    </div>
                ))}
            </div>

        </div>
    );
}
