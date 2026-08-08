import React, { useState } from 'react';
import { Tag, Github, ExternalLink, Calendar, GitCommit, Sparkles, FileText, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';

export function VersionInfoCard() {
  const [showFullChangelog, setShowFullChangelog] = useState(false);

  const releaseInfo = typeof __APP_RELEASE_INFO__ !== 'undefined' ? __APP_RELEASE_INFO__ : null;

  const version = releaseInfo?.version || (typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.22.0');
  const releaseDate = releaseInfo?.releaseDate || new Date().toISOString().split('T')[0];
  const githubUrl = 'https://github.com/fapdev77/crypto-dashboard';

  const recentChanges = releaseInfo?.recentChanges?.length
    ? releaseInfo.recentChanges
    : [
        {
          category: 'Features & Updates',
          items: [
            'Added version info card and navigation support.',
            'Dynamic Funding History Sync & Global Cache Integration across Bybit, OKX, and Bitget.',
            'Added PnL by Symbol Dashboard & Bybit Transactions Net Change Report.',
            'Added Security Backup & Encrypted API Key Export/Import.',
            'PWA support with automatic update notifications.'
          ]
        }
      ];

  const previousChanges = releaseInfo?.previousChanges;

  return (
    <div
      id="version-info-card"
      className="bg-[#151619] border border-[#2a2b30] rounded-xl p-6 flex flex-col h-full scroll-mt-20"
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <Tag className="w-4 h-4 text-[#2F6BFF]" />
          Version & Changelog
        </h3>
        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#2F6BFF]/10 text-[#2F6BFF] border border-[#2F6BFF]/20">
          v{version}
        </span>
      </div>
      <p className="text-[#8E9299] text-xs mb-5">
        Application metadata, GitHub repository source, and latest release notes
      </p>

      <div className="flex flex-col gap-4 flex-1">
        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#1a1b1e] p-3.5 rounded-lg border border-[#2a2b30]/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#2a2b30]/50 rounded-md text-[#2F6BFF]">
              <GitCommit className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-[#8E9299] uppercase tracking-wider font-medium block">Current Version</span>
              <span className="text-xs font-mono font-semibold text-white">v{version}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#2a2b30]/50 rounded-md text-emerald-400">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-[#8E9299] uppercase tracking-wider font-medium block">Release Date</span>
              <span className="text-xs font-mono font-semibold text-white">{releaseDate}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:col-span-2 border-t border-[#2a2b30]/50 pt-2.5 mt-0.5">
            <div className="p-2 bg-[#2a2b30]/50 rounded-md text-purple-400">
              <Github className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-[#8E9299] uppercase tracking-wider font-medium block">Repository Source</span>
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#2F6BFF] hover:text-blue-400 font-mono truncate flex items-center gap-1 group w-fit"
              >
                <span className="truncate">{githubUrl.replace('https://', '')}</span>
                <ExternalLink className="w-3 h-3 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
              </a>
            </div>
          </div>
        </div>

        {/* Latest Release Summary */}
        <div className="bg-[#1a1b1e] p-3.5 rounded-lg border border-[#2a2b30]/60 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Latest Release Highlights (v{version})
              </h4>
              <span className="text-[10px] text-[#8E9299] font-mono">{releaseDate}</span>
            </div>

            <div className="space-y-3">
              {recentChanges.map((section, idx) => (
                <div key={idx} className="space-y-1.5">
                  <span className="text-[11px] font-medium text-blue-400 block">{section.category}</span>
                  <ul className="space-y-1">
                    {section.items.map((item, itemIdx) => (
                      <li key={itemIdx} className="text-xs text-gray-300 flex items-start gap-1.5 leading-relaxed">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {showFullChangelog && (
              <div className="mt-4 pt-3 border-t border-[#2a2b30] space-y-3">
                <span className="text-[11px] font-medium text-amber-400 block">
                  Previous Release Highlights {previousChanges?.version ? `(v${previousChanges.version})` : ''} {previousChanges?.date ? `- ${previousChanges.date}` : ''}
                </span>
                <ul className="space-y-1">
                  {previousChanges?.items?.length ? (
                    previousChanges.items.map((item, itemIdx) => (
                      <li key={itemIdx} className="text-xs text-gray-400 flex items-start gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-500 shrink-0 mt-1.5" />
                        <span>{item}</span>
                      </li>
                    ))
                  ) : (
                    <>
                      <li className="text-xs text-gray-400 flex items-start gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-500 shrink-0 mt-1.5" />
                        <span>Added Funding Fees Dashboard & Market Overview.</span>
                      </li>
                      <li className="text-xs text-gray-400 flex items-start gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-500 shrink-0 mt-1.5" />
                        <span>Added Order Reports & Live Connection Telemetry logs.</span>
                      </li>
                    </>
                  )}
                </ul>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-[#2a2b30]/60 flex items-center justify-between gap-2">
            <button
              onClick={() => setShowFullChangelog(!showFullChangelog)}
              className="text-xs text-[#8E9299] hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
            >
              {showFullChangelog ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  View Previous Releases
                </>
              )}
            </button>

            <a
              href={`${githubUrl}/blob/main/CHANGELOG.md`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#2F6BFF] hover:text-blue-400 flex items-center gap-1 font-medium transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              Full CHANGELOG.md
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
