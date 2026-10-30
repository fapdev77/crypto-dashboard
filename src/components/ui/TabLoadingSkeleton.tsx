import React from 'react';

export function TabLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse p-2">
      {/* Top metric row skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-[#151619] border border-[#2a2b30] rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 bg-[#2a2b30] rounded" />
              <div className="w-6 h-6 rounded-md bg-[#2a2b30]" />
            </div>
            <div className="space-y-2">
              <div className="h-6 w-32 bg-[#202125] rounded" />
              <div className="h-2.5 w-16 bg-[#202125] rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Main card skeleton */}
      <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#2a2b30] pb-4">
          <div className="h-5 w-40 bg-[#2a2b30] rounded" />
          <div className="h-8 w-28 bg-[#202125] rounded-lg" />
        </div>
        <div className="space-y-3 pt-2">
          <div className="h-10 bg-[#1a1b1e] rounded-lg border border-[#2a2b30]" />
          <div className="h-12 bg-[#1a1b1e]/60 rounded-lg border border-[#2a2b30]/60" />
          <div className="h-12 bg-[#1a1b1e]/40 rounded-lg border border-[#2a2b30]/40" />
          <div className="h-12 bg-[#1a1b1e]/20 rounded-lg border border-[#2a2b30]/20" />
        </div>
      </div>
    </div>
  );
}
