
import { DollarSign, TrendingUp, PieChart, AlertCircle } from "lucide-react";
import Header from "@/components/Dashboard/Header";
import Sidebar from "@/components/Dashboard/Sidebar";
import StatCard from "@/components/Dashboard/StatCard";
import FinancialIntegrations from "@/components/Dashboard/FinancialIntegrations";
import AuditReport from "@/components/Dashboard/AuditReport";
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
            <AuditReport />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
