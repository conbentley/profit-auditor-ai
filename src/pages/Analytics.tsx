
import { useState } from "react";
import { Card } from "@/components/ui/card";
import Header from "@/components/Dashboard/Header";
import Sidebar from "@/components/Dashboard/Sidebar";
import AuditReport from "@/components/Dashboard/AuditReport";
import { Loader2 } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

// Helper function to format currency
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const Analytics = () => {
  const [timeRange] = useState("month"); // We can extend this later for different time ranges

  const { data: transactionsData, isLoading } = useQuery({
    queryKey: ['analytics-transactions'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);

      const { data, error } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('transaction_date', startDate.toISOString())
        .order('transaction_date', { ascending: true });

      if (error) throw error;
      return data;
    }
  });

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
            {/* Revenue Trend */}
            <Card className="p-6">
              <h2 className="text-lg font-medium mb-4">Revenue Trend</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis 
                      tickFormatter={(value) => formatCurrency(value)}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#0088FE" 
                      name="Revenue"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Expense Distribution */}
            <Card className="p-6">
              <h2 className="text-lg font-medium mb-4">Expense Distribution</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => entry.name}
                    >
                      {pieChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Cash Flow Analysis */}
            <Card className="p-6 lg:col-span-2">
              <h2 className="text-lg font-medium mb-4">Cash Flow Analysis</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cashFlowData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar 
                      dataKey="amount" 
                      name="Net Cash Flow"
                      fill="#8884d8"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Analytics;
