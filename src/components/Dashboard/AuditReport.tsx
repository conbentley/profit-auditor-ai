
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertTriangle, ChevronDown, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

interface AuditFinding {
  id: string;
  severity: 'critical' | 'medium' | 'low';
  title: string;
  potential_savings: number;
  status: 'pending' | 'in_progress' | 'resolved' | 'dismissed';
}

interface LatestAudit {
  id: string;
  audit_date: string;
  findings: AuditFinding[];
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

const AuditReport = () => {
  const { data: latestAudit, isLoading } = useQuery({
    queryKey: ['latest-audit'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: auditData, error: auditError } = await supabase
        .from('financial_audits')
        .select('id, audit_date, findings:audit_findings(id, severity, title, potential_savings, status)')
        .eq('user_id', user.id)
        .order('audit_date', { ascending: false })
        .limit(1)
        .single();

      if (auditError) throw auditError;
      return auditData as LatestAudit;
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Latest Audit Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const criticalFindings = latestAudit?.findings?.filter(f => f.severity === 'critical' && f.status !== 'resolved') || [];
  const pendingFindings = latestAudit?.findings?.filter(f => f.status === 'pending') || [];
  const totalPotentialSavings = latestAudit?.findings?.reduce((sum, f) => sum + (f.potential_savings || 0), 0) || 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">Latest Audit Report</CardTitle>
        {latestAudit && (
          <span className="text-sm text-gray-500">
            {format(new Date(latestAudit.audit_date), 'MMMM d, yyyy')}
          </span>
        )}
      </CardHeader>
      <CardContent>
        {latestAudit ? (
          <Collapsible className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-yellow-50 rounded-lg">
                <div className="text-sm text-yellow-800">Pending Actions</div>
                <div className="text-2xl font-semibold text-yellow-900">
                  {pendingFindings.length}
                </div>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <div className="text-sm text-red-800">Critical Issues</div>
                <div className="text-2xl font-semibold text-red-900">
                  {criticalFindings.length}
                </div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-sm text-green-800">Potential Savings</div>
                <div className="text-2xl font-semibold text-green-900">
                  {formatCurrency(totalPotentialSavings)}
                </div>
              </div>
            </div>

            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full flex items-center justify-between">
                View Full Report
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="space-y-3 pt-4">
                <h3 className="text-sm font-medium">All Findings</h3>
                {latestAudit.findings?.map((finding) => (
                  <div
                    key={finding.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(finding.status)}
                      <div>
                        <div className="text-sm font-medium">{finding.title}</div>
                        <div className="flex gap-2 mt-1">
                          <Badge className={getSeverityColor(finding.severity)}>
                            {finding.severity}
                          </Badge>
                          <Badge variant="outline">
                            {finding.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-green-600 font-medium">
                      {formatCurrency(finding.potential_savings)}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <div className="text-center py-6">
            <p className="text-gray-500">No audit reports available yet.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AuditReport;
