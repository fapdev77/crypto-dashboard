import React, { useState, useEffect, useMemo, useRef } from 'react';
import Markdown from 'react-markdown';
import { X, Globe, Search, BookOpen, ChevronUp, Menu, Printer, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSettingsStore, SupportedLocale } from '../store/settingsStore';

import ptBrManual from '../../user_manual/cpm_user_manual_pt-br.md?raw';
import ptPtManual from '../../user_manual/cpm_user_manual_pt-pt.md?raw';
import enUsManual from '../../user_manual/cpm_user_manual_en-us.md?raw';
import enGbManual from '../../user_manual/cpm_user_manual_en-gb.md?raw';
import esManual from '../../user_manual/cpm_user_manual_es-419.md?raw';
import itManual from '../../user_manual/cpm_user_manual_it-it.md?raw';

export type ManualLocale = SupportedLocale | 'pt' | 'en';

interface UserManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialLang?: ManualLocale;
}

const MANUAL_MAP: Record<SupportedLocale, string> = {
  'pt-BR': ptBrManual,
  'pt-PT': ptPtManual,
  'en-US': enUsManual,
  'en-GB': enGbManual,
  'es-419': esManual,
  'it-IT': itManual,
};

const LOCALE_OPTIONS: { id: SupportedLocale; label: string }[] = [
  { id: 'pt-BR', label: 'PT-BR' },
  { id: 'pt-PT', label: 'PT-PT' },
  { id: 'en-US', label: 'EN-US' },
  { id: 'en-GB', label: 'EN-GB' },
  { id: 'es-419', label: 'ES' },
  { id: 'it-IT', label: 'IT' },
];

function normalizeToSupportedLocale(lang?: ManualLocale, storeLocale: SupportedLocale = 'pt-BR'): SupportedLocale {
  if (!lang) return storeLocale;
  if (lang === 'pt') return 'pt-BR';
  if (lang === 'en') return 'en-US';
  if (lang in MANUAL_MAP) return lang as SupportedLocale;
  return storeLocale;
}

export function UserManualModal({ isOpen, onClose, initialLang }: UserManualModalProps) {
  const { t } = useTranslation();
  const currentStoreLocale = useSettingsStore((s) => s.locale);
  const [selectedLocale, setSelectedLocale] = useState<SupportedLocale>(() =>
    normalizeToSupportedLocale(initialLang, currentStoreLocale)
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const contentContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedLocale(normalizeToSupportedLocale(initialLang, currentStoreLocale));
  }, [initialLang, currentStoreLocale, isOpen]);

  useEffect(() => {
    const handleScroll = () => {
      if (contentContainerRef.current) {
        setShowScrollTop(contentContainerRef.current.scrollTop > 300);
      }
    };
    const ref = contentContainerRef.current;
    if (ref) {
      ref.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (ref) {
        ref.removeEventListener('scroll', handleScroll);
      }
    };
  }, [isOpen]);

  const rawMarkdown = MANUAL_MAP[selectedLocale] || enUsManual;

  // Process headers for the Table of Contents dynamically
  const tableOfContents = useMemo(() => {
    const lines = rawMarkdown.split('\n');
    const headers: { text: string; id: string; level: number }[] = [];

    lines.forEach((line) => {
      const match = line.match(/^(#{2,3})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        // Create an ID compatible with Markdown anchors
        const id = text
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // remove accents
          .replace(/[^\w\s-]/g, '') // remove special chars
          .replace(/\s+/g, '-'); // replace spaces with hyphens

        headers.push({ text, id, level });
      }
    });

    return headers;
  }, [rawMarkdown]);

  if (!isOpen) return null;

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleScrollToTop = () => {
    if (contentContainerRef.current) {
      contentContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-canvas/95 backdrop-blur-md flex flex-col overflow-hidden animate-in fade-in duration-200">
      {/* Header bar */}
      <header className="h-16 shrink-0 border-b border-line bg-surface px-4 md:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 text-fg-muted hover:text-fg hover:bg-line/50 rounded-lg transition-colors md:flex items-center justify-center"
            title="Toggle Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4 text-accent" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-fg tracking-wide">
              {t('manual.title', 'USER MANUAL')}
            </h1>
            <p className="text-[10px] text-fg-muted uppercase tracking-wider font-mono">
              {t('manual.subtitle', 'CPM Step-by-Step Guide')}
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="hidden md:flex items-center bg-[#1c1d21] border border-[#2d2f34] rounded-lg px-3 py-1.5 w-64 max-w-sm">
          <Search className="w-4 h-4 text-fg-muted shrink-0 mr-2" />
          <input
            type="text"
            placeholder={t('manual.searchPlaceholder', 'Search manual...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-xs text-fg focus:outline-none w-full placeholder-[#575b66]"
          />
        </div>

        {/* Controls and Language Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Multi-language Selector */}
          <div className="flex items-center gap-1.5 bg-[#1c1d21] border border-[#2d2f34] rounded-xl p-1 shadow-sm">
            <Globe className="w-3.5 h-3.5 text-accent ml-1 hidden sm:block shrink-0" />
            <div className="flex items-center bg-canvas border border-[#222327] rounded-lg p-0.5 shadow-inner gap-0.5 overflow-x-auto">
              {LOCALE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setSelectedLocale(opt.id)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all ${
                    selectedLocale === opt.id
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-fg-muted hover:text-fg'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Print button */}
          <button
            onClick={handlePrint}
            className="p-2 text-fg-muted hover:text-fg hover:bg-line/50 rounded-lg transition-colors duration-150"
            title={t('manual.printTooltip', 'Print Manual')}
          >
            <Printer className="w-5 h-5" />
          </button>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2 text-fg-muted hover:text-fg hover:bg-line/50 rounded-lg transition-colors duration-150 flex items-center justify-center"
            title={t('manual.closeTooltip', 'Close Manual')}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Table of Contents Sidebar */}
        <aside
          className={`shrink-0 border-r border-line bg-canvas w-64 flex flex-col transition-all duration-300 overflow-hidden ${
            isSidebarOpen ? 'ml-0' : '-ml-64'
          }`}
        >
          <div className="p-4 border-b border-line/50 bg-surface/50">
            <h3 className="text-xs font-semibold text-fg-muted tracking-wider uppercase">
              {t('manual.topicsTitle', 'Manual Topics')}
            </h3>
          </div>
          <nav className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {tableOfContents.map((header, index) => (
              <button
                key={index}
                onClick={() => scrollToSection(header.id)}
                className={`w-full text-left text-xs py-2 px-3 rounded-lg transition-all duration-150 border border-transparent ${
                  header.level === 3
                    ? 'pl-6 text-fg-muted hover:text-fg hover:bg-elevated/50'
                    : 'text-fg hover:text-fg hover:bg-elevated hover:border-line/30 font-medium'
                }`}
              >
                {header.text}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content Panel */}
        <div className="flex-1 flex flex-col min-w-0 bg-canvas relative">
          {/* Mobile search bar */}
          <div className="p-3 bg-canvas border-b border-line flex md:hidden items-center">
            <div className="flex-1 flex items-center bg-[#1c1d21] border border-[#2d2f34] rounded-lg px-3 py-1.5">
              <Search className="w-4 h-4 text-fg-muted shrink-0 mr-2" />
              <input
                type="text"
                placeholder={t('manual.searchPlaceholder', 'Search manual...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs text-fg focus:outline-none w-full placeholder-[#575b66]"
              />
            </div>
          </div>

          <div
            ref={contentContainerRef}
            className="flex-1 overflow-y-auto px-4 py-8 md:px-12 md:py-12 custom-scrollbar"
          >
            {/* Main elegant document wrapper */}
            <div className="max-w-3xl mx-auto bg-surface border border-line rounded-2xl p-6 md:p-10 shadow-2xl relative">
              {/* Highlight Cards if Search results found */}
              {searchQuery && (
                <div className="mb-6 bg-accent/10 border border-accent/20 p-3 rounded-xl text-accent text-xs">
                  {t('manual.searchingText', 'Searching for "{{query}}". Scroll to locate matching words.', {
                    query: searchQuery,
                  })}
                </div>
              )}

              {/* Dynamic Markdown renderer inside strict style definitions */}
              <div className="markdown-body text-fg text-sm leading-relaxed space-y-6">
                <Markdown
                  components={{
                    h1: ({ children }) => {
                      const text = String(children);
                      const id = text
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/[^\w\s-]/g, '')
                        .replace(/\s+/g, '-');
                      return (
                        <h1
                          id={id}
                          className="text-2xl md:text-3xl font-bold tracking-tight text-fg mb-6 border-b border-line pb-4"
                        >
                          {children}
                        </h1>
                      );
                    },
                    h2: ({ children }) => {
                      const text = String(children);
                      const id = text
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/[^\w\s-]/g, '')
                        .replace(/\s+/g, '-');
                      return (
                        <h2
                          id={id}
                          className="text-lg md:text-xl font-semibold text-accent tracking-tight mt-8 mb-4 border-l-2 border-accent pl-3"
                        >
                          {children}
                        </h2>
                      );
                    },
                    h3: ({ children }) => {
                      const text = String(children);
                      const id = text
                        .toLowerCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '')
                        .replace(/[^\w\s-]/g, '')
                        .replace(/\s+/g, '-');
                      return (
                        <h3
                          id={id}
                          className="text-base font-medium text-fg tracking-tight mt-6 mb-3"
                        >
                          {children}
                        </h3>
                      );
                    },
                    p: ({ children }) => (
                      <p className="mb-4 text-fg leading-relaxed text-sm">{children}</p>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc pl-5 mb-4 space-y-1.5 text-fg text-sm">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal pl-5 mb-4 space-y-1.5 text-fg text-sm">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                    strong: ({ children }) => (
                      <strong className="font-semibold text-fg">{children}</strong>
                    ),
                    code: ({ children }) => (
                      <code className="bg-[#1c1d21] border border-[#2d2f34] px-1.5 py-0.5 rounded text-xs font-mono text-amber-400">
                        {children}
                      </code>
                    ),
                    hr: () => <hr className="border-line my-8" />,
                  }}
                >
                  {rawMarkdown}
                </Markdown>
              </div>

              {/* Document footer watermark */}
              <div className="mt-12 pt-6 border-t border-line/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-fg-muted">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-accent" />
                  <span>CPM Terminal • Client-side Zero Trust</span>
                </div>
                <span>© {new Date().getFullYear()} Crypto Portfolio Manager</span>
              </div>
            </div>
          </div>

          {/* Floating Scroll to Top button */}
          {showScrollTop && (
            <button
              onClick={handleScrollToTop}
              className="absolute bottom-6 right-6 p-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-200 z-10 animate-in fade-in slide-in-from-bottom-5"
              title={t('manual.scrollToTop', 'Scroll to Top')}
            >
              <ChevronUp className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
