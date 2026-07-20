declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL: string;
    JWT_SECRET: string;
    NODE_ENV: 'development' | 'production' | 'test';
    NEXT_PUBLIC_VERCEL_URL?: string;

    // ─── Payme ──
    PAYME_MERCHANT_ID?: string;
    PAYME_MERCHANT_KEY?: string;
    PAYME_SANDBOX?: string;

    // ─── Click ──
    CLICK_SERVICE_ID?: string;
    CLICK_MERCHANT_ID?: string;
    CLICK_SECRET_KEY?: string;
    CLICK_SANDBOX?: string;

    // ─── 🏛️ Fiscal / Soliq ──
    MERCHANT_STIR?: string;           // Soliq to'lovchining STIR raqami
    FISCAL_TERMINAL_ID?: string;      // Virtual fiskal modul terminal ID
  }
}
