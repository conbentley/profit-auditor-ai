
import { useState } from "react";
import Header from "@/components/Dashboard/Header";
import Sidebar from "@/components/Dashboard/Sidebar";
import AuditReport from "@/components/Dashboard/AuditReport";
import { Loader2 } from "lucide-react";
import RevenueTrendChart from "@/components/Analytics/RevenueTrendChart";
import ExpenseDistributionChart from "@/components/Analytics/ExpenseDistributionChart";
import CashFlowChart from "@/components/Analytics/CashFlowChart";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";

const Analytics = () => {
  const [timeRange] = useState("month"); // We can extend this later for different time ranges

  const { data: transactionsData, isLoading } = useAnalyticsData();

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1">
          <Header />
          <main className="p-6">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Process data for charts
  const revenueByDay = transactionsData
    ?.filter(t => t.type === 'income')
    .reduce((acc, t) => {
      const date = new Date(t.transaction_date).toLocaleDateString();
      acc[date] = (acc[date] || 0) + Number(t.amount);
      return acc;
    }, {} as Record<string, number>);

  const revenueData = Object.entries(revenueByDay || {}).map(([date, amount]) => ({
    date,
    amount
  }));

  const expensesByCategory = transactionsData
    ?.filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      const category = t.category || 'Uncategorized';
      acc[category] = (acc[category] || 0) + Number(t.amount);
      return acc;
    }, {} as Record<string, number>);

  const pieChartData = Object.entries(expensesByCategory || {}).map(([name, value]) => ({
    name,
    value
  }));

  const cashFlow = transactionsData?.reduce((acc, t) => {
    const date = new Date(t.transaction_date).toLocaleDateString();
    const amount = Number(t.amount) * (t.type === 'income' ? 1 : -1);
    acc[date] = (acc[date] || 0) + amount;
    return acc;
  }, {} as Record<string, number>);

  const cashFlowData = Object.entries(cashFlow || {}).map(([date, amount]) => ({
    date,
    amount
  }));

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-6">
          <h1 className="text-2xl font-semibold mb-6">Financial Analytics</h1>
          
          {/* AI Audit Report */}
          <div className="mb-6">
            <AuditReport />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RevenueTrendChart data={revenueData} />
            <ExpenseDistributionChart data={pieChartData} />
            <CashFlowChart data={cashFlowData} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Analytics;
