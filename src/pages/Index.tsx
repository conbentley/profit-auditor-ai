
import { DollarSign, TrendingUp, PieChart, AlertCircle } from "lucide-react";
import Header from "@/components/Dashboard/Header";
import Sidebar from "@/components/Dashboard/Sidebar";
import StatCard from "@/components/Dashboard/StatCard";
import AuditReport from "@/components/Dashboard/AuditReport";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { formatCurrency, formatPercentage } from "@/lib/formatters";
import { ChatMessage } from "@/components/Chat/ChatMessage";
import { ChatInput } from "@/components/Chat/ChatInput";
import { useState } from "react";
import { Card } from "@/components/ui/card";

const Index = () => {
  const { data: metricsData, isLoading } = useDashboardMetrics();
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [query, setQuery] = useState('');
  const [isLoadingChat, setIsLoadingChat] = useState(false);

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

  const handleSendMessage = async () => {
    if (!query.trim()) return;

    setIsLoadingChat(true);
    setMessages(prev => [...prev, { role: 'user', content: query }]);
    setQuery('');

    try {
      const response = await fetch('/api/chat-with-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsLoadingChat(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">AI Profit Chat</h2>
                <div className="h-[400px] overflow-y-auto space-y-4 mb-4">
                  {messages.map((message, index) => (
                    <ChatMessage key={index} role={message.role}>
                      {message.content}
                    </ChatMessage>
                  ))}
                </div>
                <ChatInput
                  query={query}
                  setQuery={setQuery}
                  onSend={handleSendMessage}
                  isLoading={isLoadingChat}
                />
              </div>
            </Card>
            <AuditReport />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
