
import Header from "@/components/Dashboard/Header";
import Sidebar from "@/components/Dashboard/Sidebar";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FinancialIntegrations from "@/components/Dashboard/FinancialIntegrations";
import EcommerceIntegrations from "@/components/Dashboard/EcommerceIntegrations";
import MarketplaceIntegrations from "@/components/Dashboard/MarketplaceIntegrations";
import CRMIntegrations from "@/components/Dashboard/CRMIntegrations";

export default function Integrations() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-6">
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-2">Integrations</h2>
            <p className="text-gray-600 text-sm mb-6">
              Connect your financial, e-commerce, marketplaces, CRM platforms and payment providers for comprehensive profit audits.
            </p>
            <Tabs defaultValue="financial" className="space-y-6">
              <TabsList>
                <TabsTrigger value="financial">Financial</TabsTrigger>
                <TabsTrigger value="ecommerce">E-commerce</TabsTrigger>
                <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
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

              <TabsContent value="crm">
                <CRMIntegrations />
              </TabsContent>
            </Tabs>
          </Card>
        </main>
      </div>
    </div>
  );
}
