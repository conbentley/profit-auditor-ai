import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExternalLink } from "lucide-react";

interface PlatformGuide {
  title: string;
  steps: Array<{
    text: string;
    link?: {
      url: string;
      label: string;
    };
  }>;
}

const guides: Record<string, PlatformGuide> = {
  // Financial platforms
  xero: {
    title: "Get Xero API Credentials",
    steps: [
      { text: "Log in to your Xero Developer account", link: { url: "https://developer.xero.com/app/manage/", label: "Xero Developer Portal" } },
      { text: "Click 'New App' in the developer portal" },
      { text: "Fill in your application details and save" },
      { text: "On the app detail page, you'll find your Client ID (API Key) and Client Secret" },
      { text: "Need a Xero account?", link: { url: "https://www.xero.com/signup", label: "Sign up for Xero" } }
    ]
  },
  quickbooks: {
    title: "Get QuickBooks API Credentials",
    steps: [
      { text: "Sign in to your Intuit Developer account", link: { url: "https://developer.intuit.com/app/developer/dashboard", label: "Intuit Developer Dashboard" } },
      { text: "Click 'Create an app' on your dashboard" },
      { text: "Select 'QuickBooks Online' and fill in app details" },
      { text: "Under 'Development Settings', you'll find your Client ID and Client Secret" },
      { text: "Need a QuickBooks account?", link: { url: "https://quickbooks.intuit.com/signup", label: "Sign up for QuickBooks" } }
    ]
  },
  // E-commerce platforms
  shopify: {
    title: "Get Shopify API Credentials",
    steps: [
      { text: "Log in to your Shopify admin panel", link: { url: "https://admin.shopify.com/store", label: "Shopify Admin" } },
      { text: "Go to Settings > Apps and sales channels" },
      { text: "Click 'Develop apps' and then 'Create an app'" },
      { text: "After creating, click 'Configure Admin API' to get your credentials" },
      { text: "Need a Shopify store?", link: { url: "https://www.shopify.com/signup", label: "Create a Shopify store" } }
    ]
  },
  woocommerce: {
    title: "Get WooCommerce API Credentials",
    steps: [
      { text: "Log in to your WordPress admin" },
      { text: "Go to WooCommerce > Settings > Advanced > REST API" },
      { text: "Click 'Create an API key'" },
      { text: "Set permissions and generate your key" },
      { text: "Need WooCommerce?", link: { url: "https://woocommerce.com/start/", label: "Set up WooCommerce" } }
    ]
  },
  // CRM platforms
  salesforce: {
    title: "Get Salesforce API Credentials",
    steps: [
      { text: "Log in to your Salesforce account", link: { url: "https://login.salesforce.com/", label: "Salesforce Login" } },
      { text: "Go to Setup > Apps > App Manager" },
      { text: "Click 'New Connected App'" },
      { text: "Fill in the required information and enable OAuth settings" },
      { text: "After saving, you'll get your Consumer Key (API Key) and Consumer Secret" },
      { text: "Need a Salesforce account?", link: { url: "https://www.salesforce.com/form/signup/freetrial", label: "Try Salesforce" } }
    ]
  },
  hubspot: {
    title: "Get HubSpot API Credentials",
    steps: [
      { text: "Log in to your HubSpot account", link: { url: "https://app.hubspot.com/", label: "HubSpot Login" } },
      { text: "Go to Settings > Account Setup > Integrations > API Key" },
      { text: "Click 'Create key' or view existing keys" },
      { text: "Copy your API key (keep it secure!)" },
      { text: "Need a HubSpot account?", link: { url: "https://app.hubspot.com/signup", label: "Sign up for HubSpot" } }
    ]
  },
  // Marketplace platforms
  amazon: {
    title: "Get Amazon Seller API Credentials",
    steps: [
      { text: "Log in to Seller Central", link: { url: "https://sellercentral.amazon.com/", label: "Amazon Seller Central" } },
      { text: "Go to Settings > User Permissions" },
      { text: "Click 'Create new API key' under Developer Information" },
      { text: "Generate and save your API credentials" },
      { text: "Need an Amazon Seller account?", link: { url: "https://sell.amazon.com/", label: "Become an Amazon Seller" } }
    ]
  },
  // Payment platforms
  stripe: {
    title: "Get Stripe API Credentials",
    steps: [
      { text: "Log in to your Stripe Dashboard", link: { url: "https://dashboard.stripe.com/", label: "Stripe Dashboard" } },
      { text: "Go to Developers > API keys", link: { url: "https://dashboard.stripe.com/apikeys", label: "API Keys" } },
      { text: "Your publishable key starts with 'pk_', secret key starts with 'sk_'" },
      { text: "Use test mode keys for development (they start with 'pk_test_' and 'sk_test_')" },
      { text: "Need a Stripe account?", link: { url: "https://dashboard.stripe.com/register", label: "Sign up for Stripe" } }
    ]
  },
  paypal: {
    title: "Get PayPal API Credentials",
    steps: [
      { text: "Log in to your PayPal Developer Dashboard", link: { url: "https://developer.paypal.com/dashboard/", label: "PayPal Developer Dashboard" } },
      { text: "Go to Apps & Credentials", link: { url: "https://developer.paypal.com/dashboard/applications/sandbox", label: "Apps & Credentials" } },
      { text: "Create a new app or select an existing one" },
      { text: "You'll find your Client ID and Secret on the app details page" },
      { text: "Need a PayPal account?", link: { url: "https://www.paypal.com/signin", label: "Sign up for PayPal" } }
    ]
  },
  square: {
    title: "Get Square API Credentials",
    steps: [
      { text: "Log in to your Square Developer Dashboard", link: { url: "https://developer.squareup.com/apps", label: "Square Developer Dashboard" } },
      { text: "Create a new application or select an existing one" },
      { text: "Find your credentials in the Credentials tab" },
      { text: "Make sure to select the correct environment (sandbox/production)" },
      { text: "Need a Square account?", link: { url: "https://squareup.com/signup", label: "Sign up for Square" } }
    ]
  },
  adyen: {
    title: "Get Adyen API Credentials",
    steps: [
      { text: "Log in to your Adyen Customer Area", link: { url: "https://ca-live.adyen.com/ca/ca/overview/default.shtml", label: "Adyen Dashboard" } },
      { text: "Go to Developers > API credentials", link: { url: "https://ca-live.adyen.com/ca/ca/config/api_credentials.shtml", label: "API Credentials" } },
      { text: "Create a new credential or use existing ones" },
      { text: "Copy your API key and other required credentials" },
      { text: "Need an Adyen account?", link: { url: "https://www.adyen.com/signup", label: "Sign up for Adyen" } }
    ]
  },
  braintree: {
    title: "Get Braintree API Credentials",
    steps: [
      { text: "Log in to your Braintree Control Panel", link: { url: "https://sandbox.braintreegateway.com/login", label: "Braintree Dashboard" } },
      { text: "Go to Settings > API" },
      { text: "Find your Merchant ID, Public Key, and Private Key" },
      { text: "Make sure to use sandbox credentials for testing" },
      { text: "Need a Braintree account?", link: { url: "https://www.braintreepayments.com/sandbox", label: "Sign up for Braintree" } }
    ]
  },
  razorpay: {
    title: "Get Razorpay API Credentials",
    steps: [
      { text: "Log in to your Razorpay Dashboard", link: { url: "https://dashboard.razorpay.com/", label: "Razorpay Dashboard" } },
      { text: "Go to Settings > API Keys", link: { url: "https://dashboard.razorpay.com/app/keys", label: "API Keys" } },
      { text: "Generate a new API key pair if needed" },
      { text: "Copy your Key ID and Key Secret" },
      { text: "Need a Razorpay account?", link: { url: "https://razorpay.com/", label: "Sign up for Razorpay" } }
    ]
  }
};

interface CredentialsGuideModalProps {
  platform: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CredentialsGuideModal({ platform, isOpen, onClose }: CredentialsGuideModalProps) {
  const guide = platform ? guides[platform] : null;

  if (!guide) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{guide.title}</DialogTitle>
          <DialogDescription>
            Follow these steps to get your API credentials:
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          {guide.steps.map((step, index) => (
            <div key={index} className="flex gap-2">
              <span className="font-medium">{index + 1}.</span>
              <div>
                <p>{step.text}</p>
                {step.link && (
                  <a
                    href={step.link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 mt-1"
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    {step.link.label}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
