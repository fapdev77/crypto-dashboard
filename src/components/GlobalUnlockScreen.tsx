import React, { useState } from 'react';
import { ShieldAlert, Unlock } from 'lucide-react';
import { useApiKeysStore } from '../store/apiKeysStore';

export function GlobalUnlockScreen() {
  const { unlock } = useApiKeysStore();
  const [unlockPassphrase, setUnlockPassphrase] = useState('');
  const [unlockError, setUnlockError] = useState('');

  const handleUnlock = async () => {
    if (!unlockPassphrase) return;
    const success = await unlock(unlockPassphrase);
    if (!success) {
      setUnlockError('Incorrect passphrase or corrupted data.');
    } else {
      setUnlockError('');
      setUnlockPassphrase('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b0c10] backdrop-blur-sm">
      <div className="bg-[#151619] border border-[#2a2b30] rounded-xl p-8 max-w-sm w-full shadow-2xl">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-[#FF4444]/10 rounded-full">
            <ShieldAlert className="w-8 h-8 text-[#FF4444]" />
          </div>
        </div>
        <h2 className="text-xl font-medium text-white text-center mb-2">Encrypted Storage</h2>
        <p className="text-sm text-[#8E9299] text-center mb-6">
          Your API keys are encrypted locally. Please enter your passphrase to unlock them.
        </p>
        <div className="space-y-4">
          <div>
            <input
              type="password"
              value={unlockPassphrase}
              onChange={(e) => setUnlockPassphrase(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              className="w-full bg-[#111216] border border-[#2a2b30] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#2F6BFF]"
              placeholder="Enter passphrase"
            />
            {unlockError && <p className="text-[#FF4444] text-xs mt-1">{unlockError}</p>}
          </div>
          <button
            onClick={handleUnlock}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-[#2F6BFF] hover:bg-[#1E56DF] text-white font-medium rounded-lg transition-colors"
          >
            <Unlock className="w-4 h-4" />
            Unlock Keys
          </button>
        </div>
      </div>
    </div>
  );
}
