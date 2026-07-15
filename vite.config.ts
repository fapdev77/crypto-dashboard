/// <reference types="vitest" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
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
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/api\.bybit\.com\/.*/,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /^https:\/\/api\.bitget\.com\/.*/,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /^https:\/\/(www\.)?okx\.com\/.*/,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /^\/api\/proxy/,
              handler: 'NetworkOnly',
            },
          ],
        },
      }),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
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
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
