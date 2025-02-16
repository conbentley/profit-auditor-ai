
import Header from "@/components/Dashboard/Header";
import Sidebar from "@/components/Dashboard/Sidebar";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FinancialIntegrations from "@/components/Dashboard/FinancialIntegrations";
import EcommerceIntegrations from "@/components/Dashboard/EcommerceIntegrations";
import MarketplaceIntegrations from "@/components/Dashboard/MarketplaceIntegrations";
import CRMIntegrations from "@/components/Dashboard/CRMIntegrations";
import PaymentIntegrations from "@/components/Dashboard/PaymentIntegrations";
import OnboardingTasks from "@/components/Onboarding/OnboardingTasks";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function Integrations() {
  const [showOnboarding, setShowOnboarding] = useState(true);

  useEffect(() => {
    async function checkOnboardingStatus() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setShowOnboarding(true);
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('is_onboarded')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error checking onboarding status:', error);
          setShowOnboarding(true);
          return;
        }

        // If data is null or is_onboarded is false/null, show onboarding
        setShowOnboarding(!data?.is_onboarded);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setShowOnboarding(true);
      }
    }

    checkOnboardingStatus();
  }, []);

  return <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-6">
          {showOnboarding && (
            <div className="mb-6">
              <OnboardingTasks />
            </div>
          )}
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-2">Integrations</h2>
            <p className="text-gray-600 text-sm mb-6">Connect your financial, e-commerce, marketplace, payment, and CRM providers for comprehensive profit audits.</p>
            <Tabs defaultValue="financial" className="space-y-6">
              <TabsList>
                <TabsTrigger value="financial">Financial</TabsTrigger>
                <TabsTrigger value="ecommerce">E-commerce</TabsTrigger>
                <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
                <TabsTrigger value="payment">Payment</TabsTrigger>
                <TabsTrigger value="crm">CRM</TabsTrigger>
              </TabsList>
              
              <TabsContent value="financial">
                <FinancialIntegrations />
              </TabsContent>
              
              <TabsContent value="ecommerce">
                <EcommerceIntegrations />
              </TabsContent>

              <TabsContent value="marketplace">
                <MarketplaceIntegrations />
              </TabsContent>

              <TabsContent value="payment">
                <PaymentIntegrations />
              </TabsContent>

              <TabsContent value="crm">
                <CRMIntegrations />
              </TabsContent>
            </Tabs>
          </Card>
        </main>
      </div>
    </div>;
}
