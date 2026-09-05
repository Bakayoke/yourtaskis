/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SOCKET_URL: string
  readonly VITE_PUBLIC_APP_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
