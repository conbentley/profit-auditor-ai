
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
