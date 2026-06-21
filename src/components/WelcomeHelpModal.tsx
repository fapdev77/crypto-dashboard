import React from 'react';
import { X, LayoutDashboard, KeyRound, EyeOff, RefreshCw, HelpCircle } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';

interface WelcomeHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WelcomeHelpModal({ isOpen, onClose }: WelcomeHelpModalProps) {
  const { showWelcomeOnStartup, setShowWelcomeOnStartup } = useSettingsStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose} 
      />
      
      {/* Modal Content */}
      <div className="relative bg-[#151619] border border-[#2a2b30] rounded-2xl shadow-2xl w-full max-w-lg flex flex-col p-6 animate-in fade-in zoom-in-95 duration-250 max-h-[90vh] overflow-hidden">
        
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute right-4 top-4 p-1 rounded-lg text-[#8E9299] hover:text-white hover:bg-[#2a2b30]/50 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#2F6BFF]/10 border border-[#2F6BFF]/20 flex items-center justify-center">
            <HelpCircle className="w-6 h-6 text-[#2F6BFF]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Welcome to Crypto Dashboard</h3>
            <p className="text-xs text-[#8E9299] mt-0.5">Onboarding & Quick Start Guide</p>
          </div>
        </div>

        {/* Body content (scrollable) */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 mb-6 custom-scrollbar">
          <p className="text-gray-300 text-sm leading-relaxed">
            Monitor trading performance, balances, active positions, and order history across Bitget, Bybit, and OKX in one unified terminal.
          </p>

          <div className="border-t border-[#2a2b30]/50 my-2" />

          {/* Features Checklist */}
          <div className="grid grid-cols-1 gap-4">
            
            {/* Feature 1 */}
            <div className="flex gap-3.5 items-start bg-[#1a1b1e] border border-[#2a2b30]/50 p-3.5 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-[#00C853]/10 border border-[#00C853]/20 flex items-center justify-center shrink-0 mt-0.5">
                <LayoutDashboard className="w-4 h-4 text-[#00C853]" />
              </div>
              <div>
                <h4 className="text-white font-medium text-sm">Overview & Analytics</h4>
                <p className="text-[#8E9299] text-xs mt-1 leading-relaxed">
                  Track unified balances, positions, margin ratios, and view advanced analytics like realized/unrealized PnL charts.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex gap-3.5 items-start bg-[#1a1b1e] border border-[#2a2b30]/50 p-3.5 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-purple-400/10 border border-purple-400/20 flex items-center justify-center shrink-0 mt-0.5">
                <KeyRound className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <h4 className="text-white font-medium text-sm">Secure API Connections</h4>
                <p className="text-[#8E9299] text-xs mt-1 leading-relaxed">
                  Connect exchanges via the <strong>API Keys</strong> page. All credentials are saved strictly in your local browser storage using a zero-trust model.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex gap-3.5 items-start bg-[#1a1b1e] border border-[#2a2b30]/50 p-3.5 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                <EyeOff className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <h4 className="text-white font-medium text-sm">Privacy Mode</h4>
                <p className="text-[#8E9299] text-xs mt-1 leading-relaxed">
                  Click the <strong>Eye Icon</strong> in the header to toggle Privacy Mode. This hides balance, size, and PnL values for safe public sharing or streaming.
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="flex gap-3.5 items-start bg-[#1a1b1e] border border-[#2a2b30]/50 p-3.5 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-blue-400/10 border border-blue-400/20 flex items-center justify-center shrink-0 mt-0.5">
                <RefreshCw className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <h4 className="text-white font-medium text-sm">Automatic Syncing & Cache</h4>
                <p className="text-[#8E9299] text-xs mt-1 leading-relaxed">
                  Position history runs on a background cache. Customize update intervals or trigger a manual sync under the <strong>Settings</strong> page.
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#2a2b30] pt-4 mt-auto">
          {/* Startup Toggle Slider */}
          <div className="flex items-center gap-2.5 select-none">
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={showWelcomeOnStartup}
                onChange={(e) => setShowWelcomeOnStartup(e.target.checked)}
              />
              <div className="w-9 h-5 bg-[#2a2b30] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00C853]" />
            </label>
            <span className="text-xs text-[#8E9299]">Show on startup</span>
          </div>

          {/* Close Action */}
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#2F6BFF] hover:bg-[#1E56DF] text-white rounded-lg text-sm font-medium transition-colors shadow-lg hover:shadow-xl"
          >
            Get Started
          </button>
        </div>

      </div>
    </div>
  );
}
