
export type PaymentProvider = 'stripe' | 'paypal' | 'square' | 'adyen' | 'braintree' | 'razorpay';

export interface PaymentIntegration {
  id: string;
  provider: PaymentProvider;
  is_active: boolean;
  is_test_mode: boolean;
  credentials: Record<string, any>;
  metadata: Record<string, any>;
  webhook_secret?: string;
  webhook_url?: string;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}
