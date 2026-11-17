/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TILE_URL?: string;
  readonly VITE_MAP_PROVIDER?: string;
  readonly VITE_NAVER_MAP_KEY_ID?: string;
  readonly VITE_NAVER_MAP_KEY_PARAM?: string;
  readonly VITE_MAP_FALLBACK?: string;
  readonly VITE_FEATURE_TRANSIT?: string;
  readonly VITE_ALLOWED_ONLINE_HOSTS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
