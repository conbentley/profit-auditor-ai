
export type AccountingProvider = 'xero' | 'quickbooks' | 'sage';

export interface FinancialIntegration {
  id: string;
  provider: AccountingProvider;
  is_active: boolean;
  credentials: Record<string, any>;
  metadata: Record<string, any>;
  last_sync_at: string | null;
  last_sync_status: {
    status: 'pending' | 'success' | 'error' | 'syncing';
    message: string | null;
  } | null;
  sync_frequency: string | null;
  next_sync_at: string | null;
  api_version: string | null;
  connection_settings: Record<string, any>;
  documents: any[];
  created_at: string;
  updated_at: string;
}

export type EcommercePlatform = 'shopify' | 'woocommerce' | 'magento' | 'bigcommerce' | 'prestashop';

export interface EcommerceIntegration {
  id: string;
  platform: EcommercePlatform;
  store_url: string;
  store_name: string | null;
  credentials: Record<string, any>;
  is_active: boolean;
  metadata: Record<string, any>;
  last_sync_at: string | null;
  last_sync_status: {
    status: 'pending' | 'success' | 'error' | 'syncing';
    message: string | null;
  } | null;
  sync_frequency: string | null;
  next_sync_at: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
}
