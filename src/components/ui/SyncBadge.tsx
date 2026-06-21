import React, { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2 } from 'lucide-react';

interface SyncBadgeProps {
  isSyncing: boolean;
}

export function SyncBadge({ isSyncing }: SyncBadgeProps) {
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (!isSyncing) {
      // Transition from syncing to finished
      setShowSuccess(true);
      timeout = setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
    }
    return () => clearTimeout(timeout);
  }, [isSyncing]);

  if (!isSyncing && !showSuccess) return null;

  return (
    <div className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border transition-all duration-300 ${
      isSyncing 
        ? 'bg-[#2F6BFF]/10 text-[#2F6BFF] border-[#2F6BFF]/20' 
        : 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20'
    }`}>
      {isSyncing ? (
        <>
          <RefreshCw className="w-3 h-3 animate-spin" />
          <span>Syncing...</span>
        </>
      ) : (
        <>
          <CheckCircle2 className="w-3 h-3" />
          <span>Up to date</span>
        </>
      )}
    </div>
  );
}
