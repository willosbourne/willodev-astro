/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly GHOST_URL: string;
  readonly GHOST_CONTENT_API_KEY: string;
  readonly PUBLIC_UMAMI_SRC?: string;
  readonly PUBLIC_UMAMI_WEBSITE_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  umami?: {
    track(): void;
    track(eventName: string): void;
    track(eventName: string, eventData: Record<string, unknown>): void;
  };
}
