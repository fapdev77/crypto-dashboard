/// <reference types="vitest" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import packageJson from './package.json' with { type: 'json' };

function getReleaseInfo() {
  const version = packageJson.version || '1.0.0';
  let releaseDate = new Date().toISOString().split('T')[0];
  const recentChanges: { category: string; items: string[] }[] = [];
  let previousChanges: { version: string; date: string; items: string[] } | null = null;

  try {
    const changelogPath = path.resolve(__dirname, 'CHANGELOG.md');
    if (fs.existsSync(changelogPath)) {
      const content = fs.readFileSync(changelogPath, 'utf-8');
      const sections = content.split(/^#+\s+/m).filter(Boolean);

      if (sections.length > 0) {
        const currentSection = sections[0];
        const dateMatch = currentSection.match(/\(([\d]{4}-[\d]{2}-[\d]{2})\)/);
        if (dateMatch) {
          releaseDate = dateMatch[1];
        }

        let currentCategory = 'Features & Changes';
        const categoryMap = new Map<string, string[]>();

        const lines = currentSection.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('### ')) {
            currentCategory = trimmed.replace('### ', '').trim();
          } else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
            let itemText = trimmed.replace(/^[\*\-]\s+/, '').trim();
            itemText = itemText
              .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
              .replace(/\s*\([a-f0-9]{7,40}\)/gi, '')
              .trim();
            if (itemText) {
              if (!categoryMap.has(currentCategory)) {
                categoryMap.set(currentCategory, []);
              }
              categoryMap.get(currentCategory)!.push(itemText);
            }
          }
        }

        categoryMap.forEach((items, category) => {
          recentChanges.push({ category, items });
        });

        if (sections.length > 1) {
          const prevSection = sections[1];
          const prevVerMatch = prevSection.match(/^(?:\[?v?([\d\.]+)|v?([\d\.]+))/);
          const prevDateMatch = prevSection.match(/\(([\d]{4}-[\d]{2}-[\d]{2})\)/);
          const prevItems: string[] = [];

          const prevLines = prevSection.split('\n');
          for (const line of prevLines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
              let itemText = trimmed.replace(/^[\*\-]\s+/, '').trim();
              itemText = itemText
                .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                .replace(/\s*\([a-f0-9]{7,40}\)/gi, '')
                .trim();
              if (itemText) prevItems.push(itemText);
            }
          }

          if (prevItems.length > 0) {
            previousChanges = {
              version: prevVerMatch ? (prevVerMatch[1] || prevVerMatch[2]) : 'Previous',
              date: prevDateMatch ? prevDateMatch[1] : '',
              items: prevItems.slice(0, 5)
            };
          }
        }
      }
    }
  } catch (err) {
    console.error('Error parsing CHANGELOG.md:', err);
  }

  if (recentChanges.length === 0) {
    recentChanges.push({
      category: 'General',
      items: ['System updates and release improvements.']
    });
  }

  return {
    version,
    releaseDate,
    recentChanges,
    previousChanges
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const releaseInfo = getReleaseInfo();

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt', // IMPORTANTE: Abre espaço para criarmos o Card de aviso
        devOptions: {
          enabled: true // Permite que o plugin funcione no build local
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'], // Cacheia os assets básicos
          maximumFileSizeToCacheInBytes: 5000000,
        },
      }),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      '__APP_VERSION__': JSON.stringify(packageJson.version),
      '__APP_RELEASE_INFO__': JSON.stringify(releaseInfo),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    // https://vitest.dev/config/
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: [],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/cypress/**',
        '**/.{idea,git,cache,output,temp}/**',
        '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
        '**/.agent/**',
      ],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'text-summary'],
        include: ['src/store/fundingStore.ts', 'src/services/funding/**'],
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
