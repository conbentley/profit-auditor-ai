
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/react-query";
import { Toaster } from "@/components/ui/sonner";
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import Settings from "@/pages/Settings";
import Analytics from "@/pages/Analytics";
import AuditHistory from "@/pages/AuditHistory";
import AIProfitChat from "@/pages/AIProfitChat";
import Integrations from "@/pages/Integrations";
import NotFound from "@/pages/NotFound";
import Landing from "@/pages/Landing";
import Support from "@/pages/Support";
import Documentation from "@/pages/Documentation";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/history" element={<AuditHistory />} />
          <Route path="/ai-profit-assistant" element={<AIProfitChat />} />
          <Route path="/integrations" element={<Integrations />} />
          <Route path="/support" element={<Support />} />
          <Route path="/documentation" element={<Documentation />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
