
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { 
  ChevronRight, 
  BarChart3, 
  Shield, 
  MessageSquare, 
  Zap, 
  CheckCircle2,
  LineChart,
  PieChart,
  ArrowUpRight,
  Building2,
  Database,
  BarChart2
} from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <span className="text-xl font-semibold">Profit Auditor AI</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
            <Button onClick={() => navigate("/auth?signup=true")}>
              Sign Up Free
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            AI-Powered Financial Analysis for Your Business
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Transform your financial data into actionable insights. Get your first AI audit completely free, 
            no credit card required. Make data-driven decisions with confidence.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" onClick={() => navigate("/auth?signup=true")} className="gap-2">
              Start Free Audit
              <ChevronRight className="h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline">
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Pain Points Section */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-4">Problems We Solve</h2>
          <p className="text-xl text-gray-600 text-center mb-12">
            Stop struggling with complex financial analysis and let AI do the heavy lifting
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="p-6 space-y-4">
              <LineChart className="h-10 w-10 text-primary" />
              <h3 className="text-xl font-semibold">Complex Financial Data</h3>
              <p className="text-gray-600">
                Turn overwhelming financial statements into clear, actionable insights with our AI-powered analysis.
              </p>
            </Card>
            <Card className="p-6 space-y-4">
              <PieChart className="h-10 w-10 text-primary" />
              <h3 className="text-xl font-semibold">Time-Consuming Analysis</h3>
              <p className="text-gray-600">
                Get instant insights instead of spending hours analyzing spreadsheets and creating reports.
              </p>
            </Card>
            <Card className="p-6 space-y-4">
              <ArrowUpRight className="h-10 w-10 text-primary" />
              <h3 className="text-xl font-semibold">Missed Opportunities</h3>
              <p className="text-gray-600">
                Identify growth opportunities and potential issues before they impact your bottom line.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-4">
            Comprehensive Financial Analysis Suite
          </h2>
          <p className="text-xl text-gray-600 text-center mb-12">
            Everything you need to understand and optimize your business performance
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="p-6 space-y-4">
              <BarChart3 className="h-10 w-10 text-primary" />
              <h3 className="text-xl font-semibold">AI Financial Audits</h3>
              <p className="text-gray-600">
                Get detailed analysis of your financial health, cash flow projections, and profitability metrics.
              </p>
            </Card>
            <Card className="p-6 space-y-4">
              <MessageSquare className="h-10 w-10 text-primary" />
              <h3 className="text-xl font-semibold">AI Chat Assistant</h3>
              <p className="text-gray-600">
                Ask questions about your finances and get instant, data-driven answers and recommendations.
              </p>
            </Card>
            <Card className="p-6 space-y-4">
              <Shield className="h-10 w-10 text-primary" />
              <h3 className="text-xl font-semibold">Enterprise Security</h3>
              <p className="text-gray-600">
                Bank-level encryption and security protocols protect your sensitive financial data.
              </p>
            </Card>
            <Card className="p-6 space-y-4">
              <Building2 className="h-10 w-10 text-primary" />
              <h3 className="text-xl font-semibold">Business Intelligence</h3>
              <p className="text-gray-600">
                Track KPIs, monitor performance trends, and benchmark against industry standards.
              </p>
            </Card>
            <Card className="p-6 space-y-4">
              <Database className="h-10 w-10 text-primary" />
              <h3 className="text-xl font-semibold">Data Integration</h3>
              <p className="text-gray-600">
                Connect with your existing accounting software, CRM, and e-commerce platforms seamlessly.
              </p>
            </Card>
            <Card className="p-6 space-y-4">
              <BarChart2 className="h-10 w-10 text-primary" />
              <h3 className="text-xl font-semibold">Custom Reports</h3>
              <p className="text-gray-600">
                Generate professional reports and presentations with your insights and recommendations.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-4">Powerful Integrations</h2>
          <p className="text-xl text-gray-600 text-center mb-12">
            Connect with your existing tools and get insights from all your data sources
          </p>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Financial Software</h3>
              <ul className="space-y-3">
                {[
                  "QuickBooks Online integration",
                  "Xero accounting connection",
                  "Sage business cloud",
                  "FreshBooks compatibility",
                  "Custom CSV imports"
                ].map((item, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Business Platforms</h3>
              <ul className="space-y-3">
                {[
                  "Salesforce CRM integration",
                  "Shopify e-commerce sync",
                  "Amazon marketplace analytics",
                  "PayPal transaction data",
                  "Stripe payment processing"
                ].map((item, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Free Trial Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-6">Start With a Free Audit</h2>
          <p className="text-xl text-gray-600 mb-8">
            Experience the full power of our AI analysis with no commitment or credit card required.
          </p>
          <div className="bg-white rounded-lg p-8 shadow-lg">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-2xl font-semibold">What You Get:</h3>
                <ul className="space-y-3 text-left">
                  {[
                    "Complete financial health analysis",
                    "Cash flow optimization insights",
                    "Revenue growth opportunities",
                    "Cost reduction recommendations",
                    "Profitability improvement strategies",
                    "Risk assessment report",
                    "Competitive benchmarking",
                    "Export capabilities"
                  ].map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col justify-center items-center space-y-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary mb-2">Free</div>
                  <div className="text-gray-600">First Audit</div>
                </div>
                <Button size="lg" onClick={() => navigate("/auth?signup=true")} className="gap-2">
                  Get Started
                  <Zap className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t py-12">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <div className="flex items-center justify-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span className="font-semibold">Profit Auditor AI</span>
          </div>
          <p className="text-sm">
            © {new Date().getFullYear()} Profit Auditor AI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
