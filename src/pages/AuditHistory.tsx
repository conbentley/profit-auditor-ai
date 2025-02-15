
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Loader2, FileText, AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";
import Header from "@/components/Dashboard/Header";
import Sidebar from "@/components/Dashboard/Sidebar";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface AuditFinding {
  id: string;
  category: 'subscription' | 'pricing' | 'tax' | 'marketing' | 'inventory';
  severity: 'critical' | 'medium' | 'low';
  title: string;
  description: string;
  potential_savings: number;
  status: 'pending' | 'in_progress' | 'resolved' | 'dismissed';
  resolution_steps: Record<string, string>;
}

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
  estimated_savings: number;
}

interface AuditRecord {
  id: string;
  created_at: string;
  audit_date: string;
  summary: string;
  kpis: KPI[];
  recommendations: Recommendation[];
  findings?: AuditFinding[];
}

interface SupabaseAuditRecord {
  id: string;
  created_at: string;
  audit_date: string;
  summary: string;
  kpis: any;
  recommendations: any;
  findings: any[];
}

const getSeverityColor = (severity: AuditFinding['severity']) => {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 text-red-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'low':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getStatusIcon = (status: AuditFinding['status']) => {
  switch (status) {
    case 'resolved':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'in_progress':
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    case 'dismissed':
      return <AlertCircle className="h-4 w-4 text-gray-500" />;
    default:
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP'
  }).format(amount);
};

const transformSupabaseRecord = (record: SupabaseAuditRecord): AuditRecord => {
  return {
    id: record.id,
    created_at: record.created_at,
    audit_date: record.audit_date,
    summary: record.summary,
    kpis: Array.isArray(record.kpis) ? record.kpis.map((kpi: any) => ({
      metric: String(kpi.metric || ''),
      value: String(kpi.value || ''),
      trend: String(kpi.trend || ''),
    })) : [],
    recommendations: Array.isArray(record.recommendations) ? record.recommendations.map((rec: any) => ({
      title: String(rec.title || ''),
      description: String(rec.description || ''),
      impact: String(rec.impact || ''),
      difficulty: String(rec.difficulty || ''),
      estimated_savings: Number(rec.estimated_savings || 0),
    })) : [],
    findings: Array.isArray(record.findings) ? record.findings.map((finding: any) => ({
      id: String(finding.id || ''),
      category: finding.category,
      severity: finding.severity,
      title: String(finding.title || ''),
      description: String(finding.description || ''),
      potential_savings: Number(finding.potential_savings || 0),
      status: finding.status || 'pending',
      resolution_steps: finding.resolution_steps || {},
    })) : undefined,
  };
};

const AuditHistory = () => {
  const [expandedAudit, setExpandedAudit] = useState<string | null>(null);

  const { data: audits, isLoading } = useQuery({
    queryKey: ['audit-history'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: auditData, error: auditError } = await supabase
        .from('financial_audits')
        .select('*, findings:audit_findings(*)')
        .eq('user_id', user.id)
        .order('audit_date', { ascending: false }) // Sort by audit_date in descending order
        .order('created_at', { ascending: false }); // Secondary sort by created_at

      if (auditError) throw auditError;
      
      // Transform the data to ensure type safety
      return (auditData || []).map(transformSupabaseRecord);
    }
  });

  const handleExportAudit = (audit: AuditRecord) => {
    const auditData = {
      summary: audit.summary,
      kpis: audit.kpis,
      findings: audit.findings,
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

  const handleUpdateFindingStatus = async (findingId: string, newStatus: AuditFinding['status']) => {
    try {
      const { error } = await supabase
        .from('audit_findings')
        .update({ status: newStatus })
        .eq('id', findingId);

      if (error) throw error;
      toast.success("Finding status updated successfully");
    } catch (error) {
      console.error('Error updating finding status:', error);
      toast.error("Failed to update finding status");
    }
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

                <Accordion
                  type="single"
                  collapsible
                  className="mt-4"
                  value={expandedAudit === audit.id ? 'expanded' : ''}
                  onValueChange={(value) => setExpandedAudit(value === 'expanded' ? audit.id : null)}
                >
                  <AccordionItem value="expanded">
                    <AccordionTrigger>View Details</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-6 pt-4">
                        <div>
                          <h4 className="font-medium mb-2">Key Performance Indicators</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {audit.kpis.map((kpi, index) => (
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

                        {audit.findings && audit.findings.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2">Findings</h4>
                            <div className="space-y-3">
                              {audit.findings.map((finding) => (
                                <div
                                  key={finding.id}
                                  className="p-4 bg-gray-50 rounded-lg"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <Badge
                                        className={getSeverityColor(finding.severity)}
                                      >
                                        {finding.severity}
                                      </Badge>
                                      <Badge variant="outline">
                                        {finding.category}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {getStatusIcon(finding.status)}
                                      <select
                                        className="text-sm border rounded px-2 py-1"
                                        value={finding.status}
                                        onChange={(e) => handleUpdateFindingStatus(
                                          finding.id,
                                          e.target.value as AuditFinding['status']
                                        )}
                                      >
                                        <option value="pending">Pending</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="resolved">Resolved</option>
                                        <option value="dismissed">Dismissed</option>
                                      </select>
                                    </div>
                                  </div>
                                  <h5 className="font-medium">{finding.title}</h5>
                                  <p className="text-sm text-gray-600 mt-1">
                                    {finding.description}
                                  </p>
                                  <div className="mt-2 text-sm font-medium text-green-600">
                                    Potential Savings: {formatCurrency(finding.potential_savings)}
                                  </div>
                                  {finding.resolution_steps && (
                                    <div className="mt-2">
                                      <h6 className="text-sm font-medium">Resolution Steps:</h6>
                                      <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                                        {Object.entries(finding.resolution_steps).map(([step, description], index) => (
                                          <li key={index}>{description}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <h4 className="font-medium mb-2">Recommendations</h4>
                          <div className="space-y-3">
                            {audit.recommendations.map((rec, index) => (
                              <div
                                key={index}
                                className="p-4 bg-gray-50 rounded-lg"
                              >
                                <h5 className="font-medium">{rec.title}</h5>
                                <p className="text-sm text-gray-600 mt-1">
                                  {rec.description}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <Badge variant="outline" className="text-blue-600 border-blue-600">
                                    Impact: {rec.impact}
                                  </Badge>
                                  <Badge variant="outline" className="text-purple-600 border-purple-600">
                                    Difficulty: {rec.difficulty}
                                  </Badge>
                                  <Badge variant="outline" className="text-green-600 border-green-600">
                                    Est. Savings: {formatCurrency(rec.estimated_savings)}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
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
