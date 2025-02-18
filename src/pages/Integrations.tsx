
import Header from "@/components/Dashboard/Header";
import Sidebar from "@/components/Dashboard/Sidebar";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FinancialIntegrations from "@/components/Dashboard/FinancialIntegrations";
import EcommerceIntegrations from "@/components/Dashboard/EcommerceIntegrations";
import MarketplaceIntegrations from "@/components/Dashboard/MarketplaceIntegrations";
import CRMIntegrations from "@/components/Dashboard/CRMIntegrations";
import PaymentIntegrations from "@/components/Dashboard/PaymentIntegrations";
import SpreadsheetIntegrations from "@/components/Dashboard/SpreadsheetIntegrations";
import WebsiteIntegrations from "@/components/Dashboard/WebsiteIntegrations";

export default function Integrations() {
  return <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-6">
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-2">Integrations</h2>
            <p className="text-gray-600 text-sm mb-6">Connect your financial, website, e-commerce, marketplace, payment, and CRM providers for comprehensive profit audits.</p>
            <Tabs defaultValue="financial" className="space-y-6">
              <TabsList>
                <TabsTrigger value="financial">Financial</TabsTrigger>
                <TabsTrigger value="website">Website</TabsTrigger>
                <TabsTrigger value="ecommerce">E-commerce</TabsTrigger>
                <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
                <TabsTrigger value="payment">Payment</TabsTrigger>
                <TabsTrigger value="crm">CRM</TabsTrigger>
                <TabsTrigger value="spreadsheet">Spreadsheet</TabsTrigger>
              </TabsList>
              
              <TabsContent value="financial">
                <FinancialIntegrations />
              </TabsContent>

              <TabsContent value="website">
                <WebsiteIntegrations />
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

              <TabsContent value="spreadsheet">
                <SpreadsheetIntegrations />
              </TabsContent>
            </Tabs>
          </Card>
        </main>
      </div>
    </div>;
}
