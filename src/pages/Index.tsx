
import { DollarSign, TrendingUp, PieChart, AlertCircle } from "lucide-react";
import Header from "@/components/Dashboard/Header";
import Sidebar from "@/components/Dashboard/Sidebar";
import StatCard from "@/components/Dashboard/StatCard";
import AuditReport from "@/components/Dashboard/AuditReport";
import OnboardingTasks from "@/components/Onboarding/OnboardingTasks";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { formatCurrency, formatPercentage } from "@/lib/formatters";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { data: metricsData, isLoading } = useDashboardMetrics();
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

        setShowOnboarding(!data?.is_onboarded);
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        setShowOnboarding(true);
      }
    }

    checkOnboardingStatus();
  }, []);

  const metrics = metricsData?.metrics ?? {
    revenue: 0,
    profit_margin: 0,
    expense_ratio: 0,
    audit_alerts: 0
  };

  const changes = metricsData?.changes ?? {
    revenue: 0,
    profit_margin: 0,
    expense_ratio: 0,
    audit_alerts: 0
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 w-full">
        <Header />
        <main className="px-3 py-4 md:p-6 mt-16 md:mt-0 max-w-full overflow-x-hidden">
          {showOnboarding && (
            <div className="mb-4 md:mb-6">
              <OnboardingTasks />
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-4 md:mb-6">
            <StatCard
              title="Monthly Revenue"
              value={formatCurrency(metrics.revenue)}
              trend="vs last month"
              trendValue={`${changes.revenue > 0 ? '+' : ''}${formatPercentage(changes.revenue)}`}
              icon={DollarSign}
              trendUp={changes.revenue >= 0}
              isLoading={isLoading}
            />
            <StatCard
              title="Profit Margin"
              value={formatPercentage(metrics.profit_margin)}
              trend="vs last month"
              trendValue={`${changes.profit_margin > 0 ? '+' : ''}${formatPercentage(changes.profit_margin)}`}
              icon={TrendingUp}
              trendUp={changes.profit_margin >= 0}
              isLoading={isLoading}
            />
            <StatCard
              title="Expense Ratio"
              value={formatPercentage(metrics.expense_ratio)}
              trend="vs last month"
              trendValue={`${changes.expense_ratio > 0 ? '+' : ''}${formatPercentage(changes.expense_ratio)}`}
              icon={PieChart}
              trendUp={changes.expense_ratio < 0}
              isLoading={isLoading}
            />
            <StatCard
              title="Audit Alerts"
              value={metrics.audit_alerts.toString()}
              trend="vs last month"
              trendValue={`${changes.audit_alerts > 0 ? '+' : ''}${formatPercentage(changes.audit_alerts)}`}
              icon={AlertCircle}
              trendUp={changes.audit_alerts < 0}
              isLoading={isLoading}
            />
          </div>

          <div className="w-full">
            <AuditReport />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
