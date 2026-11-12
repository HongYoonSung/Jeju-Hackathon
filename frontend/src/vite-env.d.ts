/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TILE_URL?: string;
  readonly VITE_FEATURE_TRANSIT?: string;
  readonly VITE_ALLOWED_ONLINE_HOSTS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
