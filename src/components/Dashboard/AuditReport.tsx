
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface KPI {
  metric: string;
  value: string;
  trend: string;
}

interface Recommendation {
  title: string;
  description: string;
  impact: string;
  difficulty: string;
}

interface AuditResult {
  summary: string;
  kpis: KPI[];
  recommendations: Recommendation[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function AuditReport() {
  const [isLoading, setIsLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [query, setQuery] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

  const generateAudit = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const currentDate = new Date();
      const response = await supabase.functions.invoke('generate-audit', {
        body: {
          user_id: user.id,
          month: currentDate.getMonth() + 1,
          year: currentDate.getFullYear(),
        },
      });

      if (response.error) throw response.error;
      setAuditResult(response.data);
      toast.success("Audit report generated successfully");
    } catch (error) {
      console.error("Failed to generate audit:", error);
      toast.error("Failed to generate audit report");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!query.trim() || !auditResult) return;

    setIsChatLoading(true);
    const userMessage = query.trim();
    setQuery("");

    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      const response = await supabase.functions.invoke('chat-with-audit', {
        body: {
          query: userMessage,
          auditContext: auditResult,
        },
      });

      if (response.error) throw response.error;

      // Add AI response to chat
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.data.response 
      }]);
    } catch (error) {
      console.error("Failed to get AI response:", error);
      toast.error("Failed to get AI response");
    } finally {
      setIsChatLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">AI Audit Report</h2>
          <Button
            onClick={generateAudit}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate New Audit"
            )}
          </Button>
        </div>

        {auditResult && (
          <div className="space-y-6">
            {/* Summary Section */}
            <div>
              <h3 className="text-md font-medium mb-2">Executive Summary</h3>
              <p className="text-sm text-gray-600">{auditResult.summary}</p>
            </div>

            {/* KPIs Section */}
            <div>
              <h3 className="text-md font-medium mb-4">Key Performance Indicators</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {auditResult.kpis.map((kpi, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-100"
                  >
                    <div className="text-sm text-gray-600">{kpi.metric}</div>
                    <div className="text-lg font-semibold mt-1">{kpi.value}</div>
                    <div className={`text-sm mt-1 ${
                      kpi.trend.includes('+') ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {kpi.trend}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations Section */}
            <div>
              <h3 className="text-md font-medium mb-4">Recommendations</h3>
              <div className="space-y-4">
                {auditResult.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-100"
                  >
                    <h4 className="font-medium text-gray-900">{rec.title}</h4>
                    <p className="mt-1 text-sm text-gray-600">
                      {rec.description}
                    </p>
                    <div className="mt-2 flex gap-4">
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                        Impact: {rec.impact}
                      </span>
                      <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">
                        Difficulty: {rec.difficulty}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Chat Section */}
      {auditResult && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Ask About the Audit</h3>
            {messages.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearChat}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Clear Chat
              </Button>
            )}
          </div>

          {/* Chat Messages */}
          <ScrollArea className="h-[400px] pr-4 mb-4">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground ml-4'
                        : 'bg-muted mr-4'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted p-3 rounded-lg mr-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Chat Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Ask a question about your audit report..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={isChatLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={isChatLoading || !query.trim()}
            >
              {isChatLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
