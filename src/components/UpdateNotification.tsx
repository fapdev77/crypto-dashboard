import React from 'react';
// @ts-expect-error PWA virtual module
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

export function UpdateNotification() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      console.log('SW Registered:', r);
    },
    onRegisterError(error: any) {
      console.error('SW registration error', error);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:w-96 bg-[#1a1b1e] border border-[#2a2b30] rounded-xl shadow-xl z-[9999] overflow-hidden shadow-black/50">
      <div className="p-4 flex items-start gap-4">
        <div className="bg-[#2a2b30] p-2 rounded-lg text-blue-400 shrink-0">
          <RefreshCw className="w-5 h-5 animate-[spin_3s_linear_infinite]" />
        </div>
        <div className="flex-1">
          <h3 className="text-[15px] font-semibold text-gray-200 mb-1">Nova versão disponível</h3>
          <p className="text-sm text-gray-400">
            Uma nova versão do aplicativo está pronta para ser usada. Atualize para ver as mudanças e correções.
          </p>
        </div>
        <button 
          onClick={() => setNeedRefresh(false)}
          className="text-gray-500 hover:text-gray-300 transition-colors shrink-0 p-1 bg-[#2a2b30] hover:bg-[#3a3b40] rounded-md"
          aria-label="Dispensar aviso"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex border-t border-[#2a2b30]">
        <button
          onClick={() => setNeedRefresh(false)}
          className="flex-1 py-3 text-sm font-medium text-gray-400 hover:text-gray-200 hover:bg-[#2a2b30]/50 transition-colors"
        >
          Agora Não
        </button>
        <button
          onClick={() => updateServiceWorker(true)}
          className="flex-1 py-3 text-sm font-medium text-blue-400 hover:text-blue-300 hover:bg-[#2a2b30]/50 transition-colors border-l border-[#2a2b30]"
        >
          Atualizar Agora
        </button>
      </div>
    </div>
  );
}
