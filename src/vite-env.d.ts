interface ImportMetaEnv {
  readonly VITE_ROOT_FOLDER_ID: string
  readonly VITE_ADMIN_PASSWORD?: string
  readonly VITE_GOOGLE_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY: string;
    [key: string]: any;
  }
}