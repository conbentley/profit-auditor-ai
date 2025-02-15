
export type AccountingProvider = 'xero' | 'quickbooks' | 'sage';

export interface FinancialIntegration {
  id: string;
  provider: AccountingProvider;
  is_active: boolean;
  credentials: Record<string, any>;
  metadata: Record<string, any>;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export type EcommercePlatform = 'shopify' | 'woocommerce' | 'magento' | 'bigcommerce' | 'prestashop';

export interface EcommerceIntegration {
  id: string;
  platform: EcommercePlatform;
  store_url: string;
  store_name: string | null;
  credentials: {
    api_key: string;
    api_secret: string;
    access_token?: string;
  };
  is_active: boolean;
  last_sync_at: string | null;
}
