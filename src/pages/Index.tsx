
import { DollarSign, TrendingUp, PieChart, AlertCircle } from "lucide-react";
import Header from "@/components/Dashboard/Header";
import Sidebar from "@/components/Dashboard/Sidebar";
import StatCard from "@/components/Dashboard/StatCard";
import FinancialIntegrations from "@/components/Dashboard/FinancialIntegrations";
import { Card } from "@/components/ui/card";

const Index = () => {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <StatCard
              title="Monthly Revenue"
              value="$45,231"
              trend="vs last month"
              trendValue="+12.5%"
              icon={DollarSign}
              trendUp={true}
            />
            <StatCard
              title="Profit Margin"
              value="32.8%"
              trend="vs last month"
              trendValue="+2.1%"
              icon={TrendingUp}
              trendUp={true}
            />
            <StatCard
              title="Expense Ratio"
              value="24.3%"
              trend="vs target"
              trendValue="-0.8%"
              icon={PieChart}
              trendUp={false}
            />
            <StatCard
              title="Audit Alerts"
              value="3"
              trend="open issues"
              trendValue="Critical"
              icon={AlertCircle}
              trendUp={false}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FinancialIntegrations />

            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Latest Audit Insights</h2>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-100"
                  >
                    <h3 className="font-medium text-gray-900">
                      Cost Optimization Opportunity #{i}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      AI analysis suggests potential savings in operational costs
                      through vendor consolidation.
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  "Run New Audit",
                  "Connect Software",
                  "View Reports",
                  "Update Settings",
                ].map((action) => (
                  <button
                    key={action}
                    className="p-4 text-left bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors"
                  >
                    <span className="font-medium text-gray-900">{action}</span>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
