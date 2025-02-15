
import { useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Shield, UserRound, Settings2, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AuditEvent {
  id: string;
  event_type: string;
  created_at: string;
  metadata: any;
}

const PAGE_SIZE = 10;

export default function AuditLogViewer() {
  const [currentPage, setCurrentPage] = useState(1);

  const { data: auditEvents, isLoading } = useQuery({
    queryKey: ['audit-events', currentPage],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('user_audit_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE - 1);

      if (error) throw error;
      return data as AuditEvent[];
    }
  });

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'mfa_enabled':
      case 'mfa_disabled':
        return <Shield className="h-4 w-4" />;
      case 'login':
      case 'logout':
        return <UserRound className="h-4 w-4" />;
      case 'settings_updated':
        return <Settings2 className="h-4 w-4" />;
      case 'data_exported':
        return <Download className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const formatEventType = (eventType: string) => {
    return eventType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-medium mb-4">Security Audit Log</h3>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Type</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="w-[200px]">Date & Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8">
                  Loading audit logs...
                </TableCell>
              </TableRow>
            ) : auditEvents && auditEvents.length > 0 ? (
              auditEvents.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {getEventIcon(event.event_type)}
                      {formatEventType(event.event_type)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {event.metadata && (
                      <pre className="text-sm whitespace-pre-wrap">
                        {JSON.stringify(event.metadata, null, 2)}
                      </pre>
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(event.created_at), 'MMM d, yyyy HH:mm')}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8">
                  No audit logs found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {auditEvents && auditEvents.length > 0 && (
        <div className="flex justify-end items-center gap-4 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => p + 1)}
            disabled={auditEvents.length < PAGE_SIZE}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </Card>
  );
}
