
import Header from "@/components/Dashboard/Header";
import Sidebar from "@/components/Dashboard/Sidebar";
import { Card } from "@/components/ui/card";
import FinancialIntegrations from "@/components/Dashboard/FinancialIntegrations";

export default function Integrations() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-6">
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-6">Integrations</h2>
            <div className="space-y-6">
              <FinancialIntegrations />
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
