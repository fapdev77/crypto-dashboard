/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
/// <reference types="vite-plugin-pwa/info" />
/// <reference types="vite-plugin-pwa/react" />

declare const __APP_VERSION__: string;
declare const __APP_RELEASE_INFO__: {
  version: string;
  releaseDate: string;
  recentChanges: { category: string; items: string[] }[];
  previousChanges?: { version: string; date: string; items: string[] } | null;
};
