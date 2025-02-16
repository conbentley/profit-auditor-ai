
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, BarChart3, Shield, MessageSquare, Zap, CheckCircle2 } from "lucide-react";

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
            Get your first AI audit completely free, no credit card required.
            Unlock insights and optimize your business performance today.
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

      {/* Features Grid */}
      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">
            Comprehensive Financial Analysis Suite
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="p-6 space-y-4">
              <BarChart3 className="h-10 w-10 text-primary" />
              <h3 className="text-xl font-semibold">Instant AI Audits</h3>
              <p className="text-gray-600">
                Get detailed financial analysis and insights powered by advanced AI technology.
              </p>
            </Card>
            <Card className="p-6 space-y-4">
              <MessageSquare className="h-10 w-10 text-primary" />
              <h3 className="text-xl font-semibold">AI Chat Assistant</h3>
              <p className="text-gray-600">
                Chat with our AI to understand your financial data and get personalized recommendations.
              </p>
            </Card>
            <Card className="p-6 space-y-4">
              <Shield className="h-10 w-10 text-primary" />
              <h3 className="text-xl font-semibold">Secure Platform</h3>
              <p className="text-gray-600">
                Your financial data is protected with enterprise-grade security and encryption.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Free Trial Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-6">Start With a Free Audit</h2>
          <p className="text-xl text-gray-600 mb-8">
            No credit card required. Experience the full power of our AI analysis.
          </p>
          <div className="bg-white rounded-lg p-8 shadow-lg">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-2xl font-semibold">What You Get:</h3>
                <ul className="space-y-3 text-left">
                  {[
                    "Complete financial health analysis",
                    "Personalized recommendations",
                    "Performance metrics dashboard",
                    "AI-powered insights",
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
