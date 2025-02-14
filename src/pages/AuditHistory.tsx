
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Loader2, FileText } from "lucide-react";
import Header from "@/components/Dashboard/Header";
import Sidebar from "@/components/Dashboard/Sidebar";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AuditRecord {
  id: string;
  created_at: string;
  audit_date: string;
  summary: string;
  kpis: any[];
  recommendations: any[];
}

const AuditHistory = () => {
  const [expandedAudit, setExpandedAudit] = useState<string | null>(null);

  const { data: audits, isLoading } = useQuery({
    queryKey: ['audit-history'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('financial_audits')
        .select('*')
        .eq('user_id', user.id)
        .order('audit_date', { ascending: false });

      if (error) throw error;
      return data as AuditRecord[];
    }
  });

  const handleExportAudit = (audit: AuditRecord) => {
    const auditData = {
      summary: audit.summary,
      kpis: audit.kpis,
      recommendations: audit.recommendations,
      date: format(new Date(audit.audit_date), 'MM/dd/yyyy'),
      exportDate: format(new Date(), 'MM/dd/yyyy HH:mm:ss')
    };

    const blob = new Blob([JSON.stringify(auditData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-report-${format(new Date(audit.audit_date), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success("Audit report exported successfully");
  };

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

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-6">
          <h1 className="text-2xl font-semibold mb-6">Audit History</h1>
          
          <div className="space-y-4">
            {audits?.map((audit) => (
              <Card key={audit.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-medium">
                      Audit Report - {format(new Date(audit.audit_date), 'MMMM d, yyyy')}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Generated on {format(new Date(audit.created_at), 'MM/dd/yyyy HH:mm')}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportAudit(audit)}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Export
                  </Button>
                </div>

                <div className="mt-4">
                  <h4 className="font-medium mb-2">Summary</h4>
                  <p className="text-gray-600">{audit.summary}</p>
                </div>

                {expandedAudit === audit.id ? (
                  <>
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Key Performance Indicators</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {audit.kpis.map((kpi: any, index: number) => (
                          <div
                            key={index}
                            className="p-4 bg-gray-50 rounded-lg"
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

                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Recommendations</h4>
                      <div className="space-y-3">
                        {audit.recommendations.map((rec: any, index: number) => (
                          <div
                            key={index}
                            className="p-4 bg-gray-50 rounded-lg"
                          >
                            <h5 className="font-medium">{rec.title}</h5>
                            <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                            <div className="mt-2 flex gap-2">
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

                    <Button
                      variant="ghost"
                      className="mt-4"
                      onClick={() => setExpandedAudit(null)}
                    >
                      Show Less
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="ghost"
                    className="mt-4"
                    onClick={() => setExpandedAudit(audit.id)}
                  >
                    Show More
                  </Button>
                )}
              </Card>
            ))}

            {(!audits || audits.length === 0) && (
              <Card className="p-6">
                <p className="text-center text-gray-500">No audit history found.</p>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AuditHistory;
