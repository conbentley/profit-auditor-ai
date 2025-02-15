
import Header from "@/components/Dashboard/Header";
import Sidebar from "@/components/Dashboard/Sidebar";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FinancialIntegrations from "@/components/Dashboard/FinancialIntegrations";
import EcommerceIntegrations from "@/components/Dashboard/EcommerceIntegrations";
import MarketplaceIntegrations from "@/components/Dashboard/MarketplaceIntegrations";

export default function Integrations() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-6">
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-6">Integrations</h2>
            <Tabs defaultValue="financial" className="space-y-6">
              <TabsList>
                <TabsTrigger value="financial">Financial</TabsTrigger>
                <TabsTrigger value="ecommerce">E-commerce</TabsTrigger>
                <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
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
            </Tabs>
          </Card>
        </main>
      </div>
    </div>
  );
}
