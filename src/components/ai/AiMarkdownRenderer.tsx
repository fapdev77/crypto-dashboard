import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, ExternalLink, Maximize2, X, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { AiChartBlock, ChartConfig } from './AiChartBlock';
import { AiTableRenderer } from './AiTableRenderer';

interface CodeBlockProps {
  language?: string;
  code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  // Check if code block is a chart declaration (e.g., chart:bar, chart:line, chart:pie, chart:area or json with chart structure)
  if (language && (language.startsWith('chart') || language === 'chart')) {
    try {
      const parsed = JSON.parse(code);
      let chartType: ChartConfig['type'] = 'bar';
      if (language.includes('line')) chartType = 'line';
      else if (language.includes('pie')) chartType = 'pie';
      else if (language.includes('donut')) chartType = 'donut';
      else if (language.includes('area')) chartType = 'area';
      else if (parsed.type) chartType = parsed.type;

      const chartConfig: ChartConfig = {
        type: chartType,
        title: parsed.title,
        description: parsed.description,
        data: parsed.data || [],
        dataKeys: parsed.dataKeys,
        colors: parsed.colors,
        unit: parsed.unit,
        formatAsCurrency: parsed.formatAsCurrency,
        formatAsPercent: parsed.formatAsPercent,
      };

      return <AiChartBlock config={chartConfig} />;
    } catch (e) {
      console.warn('Failed to parse chart json block:', e);
    }
  }

  // Also check if language is json and contains a "chartType" or "type": "bar/line/pie/donut/area"
  if (language === 'json') {
    try {
      const parsed = JSON.parse(code);
      if (
        parsed &&
        (parsed.chartType ||
          ['bar', 'line', 'pie', 'donut', 'area'].includes(parsed.type)) &&
        Array.isArray(parsed.data)
      ) {
        const chartConfig: ChartConfig = {
          type: parsed.type || parsed.chartType || 'bar',
          title: parsed.title,
          description: parsed.description,
          data: parsed.data,
          dataKeys: parsed.dataKeys,
          colors: parsed.colors,
          unit: parsed.unit,
          formatAsCurrency: parsed.formatAsCurrency,
          formatAsPercent: parsed.formatAsPercent,
        };
        return <AiChartBlock config={chartConfig} />;
      }
    } catch {
      // Normal JSON code block
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Code copied to clipboard', {
        id: 'code-copy',
        duration: 1500,
        style: {
          background: '#151619',
          color: '#ffffff',
          border: '1px solid #2a2b30',
          fontSize: '12px',
        },
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = code;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy code', err);
      }
    }
  };

  return (
    <div className="my-2.5 rounded-xl border border-[#2a2b30] bg-[#0c0d10] overflow-hidden text-xs shadow-md">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#151619] border-b border-[#2a2b30] text-[11px] text-[#8E9299]">
        <div className="flex items-center gap-1.5 font-mono">
          <span className="w-2 h-2 rounded-full bg-[#2F6BFF]/70" />
          <span className="font-mono uppercase tracking-wider text-[10px] text-gray-300 font-semibold">
            {language || 'code'}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-[#2a2b30] text-[#8E9299] hover:text-white transition cursor-pointer text-[11px]"
          title="Copy code"
          type="button"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 text-[10px] font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="text-[10px]">Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-3 overflow-x-auto font-mono text-[11px] leading-relaxed text-gray-200 bg-[#0a0b0d]">
        <pre className="m-0 p-0 font-mono whitespace-pre font-normal">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};

interface ImageModalProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

const ImageLightboxModal: React.FC<ImageModalProps> = ({ src, alt, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative max-w-4xl max-h-[90vh] bg-[#121318] border border-[#2a2b30] rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#17181f] border-b border-[#2a2b30] text-xs text-gray-200">
          <span className="truncate max-w-md font-medium text-gray-300">{alt || 'Image Preview'}</span>
          <div className="flex items-center gap-2">
            <a
              href={src}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg hover:bg-[#252733] text-gray-400 hover:text-white transition cursor-pointer"
              title="Download Image"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 transition cursor-pointer"
              title="Close Preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="p-2 overflow-auto flex items-center justify-center bg-black/40">
          <img src={src} alt={alt || 'Image'} className="max-w-full max-h-[75vh] object-contain rounded-lg" />
        </div>
      </div>
    </div>
  );
};

interface AiMarkdownRendererProps {
  content: string;
  className?: string;
}

export const AiMarkdownRenderer: React.FC<AiMarkdownRendererProps> = ({ content, className = '' }) => {
  const [activeImage, setActiveImage] = useState<{ src: string; alt?: string } | null>(null);

  return (
    <>
      <div className={`ai-markdown-content leading-relaxed text-xs text-gray-200 ${className}`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // Eliminate wrapper pre so CodeBlock handles container styling cleanly
            pre: ({ children }) => <>{children}</>,

            // Handle inline and block code
            code: ({ className: codeClassName, children, ...props }) => {
              const match = /language-(\w+)/.exec(codeClassName || '');
              const rawContent = String(children).replace(/\n$/, '');
              const isMultiline = rawContent.includes('\n');

              if (!match && !isMultiline) {
                return (
                  <code
                    className="bg-[#1e1f24] text-cyan-300 px-1.5 py-0.5 rounded text-[11px] font-mono border border-[#2a2b30] font-normal"
                    {...props}
                  >
                    {children}
                  </code>
                );
              }

              return <CodeBlock language={match ? match[1] : ''} code={rawContent} />;
            },

            // Images with Lightbox Zoom capability
            img: ({ src, alt }) => {
              if (!src) return null;
              return (
                <div className="my-2.5 inline-block group relative rounded-xl overflow-hidden border border-[#2a2b30] bg-[#121318]">
                  <img
                    src={src}
                    alt={alt || 'Chart or illustration'}
                    className="max-h-72 w-auto object-contain rounded-lg cursor-pointer transition group-hover:opacity-90"
                    onClick={() => setActiveImage({ src, alt })}
                    loading="lazy"
                  />
                  <button
                    type="button"
                    onClick={() => setActiveImage({ src, alt })}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition shadow"
                    title="Expand Image"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                  {alt && (
                    <div className="px-2.5 py-1 text-[10px] text-gray-400 bg-[#16171d] border-t border-[#2a2b30] truncate">
                      {alt}
                    </div>
                  )}
                </div>
              );
            },

            // Bold & Strong emphasis
            strong: ({ children }) => (
              <strong className="font-bold text-white tracking-normal">{children}</strong>
            ),

            // Italic emphasis
            em: ({ children }) => <em className="italic text-gray-300">{children}</em>,

            // Headings scaled for chat bubbles
            h1: ({ children }) => (
              <h1 className="text-sm font-bold text-white mt-3 mb-1.5 pb-1 border-b border-[#2a2b30] flex items-center gap-1.5">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-xs font-bold text-white mt-2.5 mb-1 text-cyan-200">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-xs font-semibold text-gray-200 mt-2 mb-1">
                {children}
              </h3>
            ),
            h4: ({ children }) => (
              <h4 className="text-[11px] font-semibold text-gray-300 mt-1.5 mb-0.5">
                {children}
              </h4>
            ),

            // Paragraphs
            p: ({ children }) => (
              <p className="my-1.5 leading-relaxed text-gray-200 last:mb-0 first:mt-0">
                {children}
              </p>
            ),

            // Unordered Lists
            ul: ({ children }) => (
              <ul className="list-disc list-outside pl-4 space-y-1 my-2 text-gray-200">
                {children}
              </ul>
            ),

            // Ordered Lists
            ol: ({ children }) => (
              <ol className="list-decimal list-outside pl-4 space-y-1 my-2 text-gray-200">
                {children}
              </ol>
            ),

            // List Items
            li: ({ children }) => (
              <li className="leading-relaxed text-xs pl-0.5">{children}</li>
            ),

            // Blockquotes
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 border-[#2F6BFF] pl-3 py-1 my-2 text-[#8E9299] italic bg-[#2F6BFF]/5 rounded-r">
                {children}
              </blockquote>
            ),

            // Links
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#2F6BFF] hover:underline font-medium inline-flex items-center gap-0.5 cursor-pointer"
              >
                <span>{children}</span>
                <ExternalLink className="w-2.5 h-2.5 inline-block opacity-75" />
              </a>
            ),

            // Tables with interactive toolbar (Excel .xlsx export + Google Sheets TSV copy)
            table: ({ children }) => <AiTableRenderer>{children}</AiTableRenderer>,
            thead: ({ children }) => (
              <thead className="bg-[#151619] text-gray-200 border-b border-[#2a2b30]">
                {children}
              </thead>
            ),
            tbody: ({ children }) => (
              <tbody className="divide-y divide-[#2a2b30]/50 bg-[#0e0f12]">{children}</tbody>
            ),
            tr: ({ children }) => (
              <tr className="hover:bg-[#151619]/60 transition-colors">{children}</tr>
            ),
            th: ({ children }) => (
              <th className="px-3 py-1.5 font-semibold text-gray-300 whitespace-nowrap">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="px-3 py-1.5 text-gray-300 whitespace-normal">{children}</td>
            ),

            // Horizontal rule
            hr: () => <hr className="my-2.5 border-t border-[#2a2b30]" />,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>

      {/* Lightbox for clicked images */}
      {activeImage && (
        <ImageLightboxModal
          src={activeImage.src}
          alt={activeImage.alt}
          onClose={() => setActiveImage(null)}
        />
      )}
    </>
  );
};
