/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string
  readonly VITE_API_URL?: string
  readonly VITE_HEDERA_NETWORK: 'mainnet' | 'testnet'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
