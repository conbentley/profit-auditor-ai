
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sidebar } from "@/components/Dashboard/Sidebar";
import Header from "@/components/Dashboard/Header";

const Documentation = () => {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-6">
          <div className="max-w-5xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold">Platform Documentation</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Getting Started */}
              <Card>
                <CardHeader>
                  <CardTitle>Getting Started</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <h3 className="font-semibold">Platform Overview</h3>
                  <p className="text-gray-600">Learn about the core features and capabilities of our profit auditing platform.</p>
                  <h3 className="font-semibold">Quick Start Guide</h3>
                  <p className="text-gray-600">Set up your account and start your first audit in minutes.</p>
                </CardContent>
              </Card>

              {/* Analytics & Reporting */}
              <Card>
                <CardHeader>
                  <CardTitle>Analytics & Reporting</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <h3 className="font-semibold">Financial Analytics</h3>
                  <p className="text-gray-600">Understand your financial metrics and performance indicators.</p>
                  <h3 className="font-semibold">Custom Reports</h3>
                  <p className="text-gray-600">Create and customize reports for your specific needs.</p>
                </CardContent>
              </Card>

              {/* AI Assistant */}
              <Card>
                <CardHeader>
                  <CardTitle>AI Profit Assistant</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <h3 className="font-semibold">Using the AI Assistant</h3>
                  <p className="text-gray-600">Get the most out of our AI-powered profit optimization recommendations.</p>
                  <h3 className="font-semibold">Advanced Features</h3>
                  <p className="text-gray-600">Explore advanced AI capabilities for deeper insights.</p>
                </CardContent>
              </Card>

              {/* Integrations */}
              <Card>
                <CardHeader>
                  <CardTitle>Integrations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <h3 className="font-semibold">Available Integrations</h3>
                  <p className="text-gray-600">Connect with your favorite tools and services.</p>
                  <h3 className="font-semibold">Setup Guides</h3>
                  <p className="text-gray-600">Step-by-step instructions for connecting each integration.</p>
                </CardContent>
              </Card>

              {/* Security */}
              <Card>
                <CardHeader>
                  <CardTitle>Security & Privacy</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <h3 className="font-semibold">Data Protection</h3>
                  <p className="text-gray-600">Learn about our security measures and data handling practices.</p>
                  <h3 className="font-semibold">Compliance</h3>
                  <p className="text-gray-600">Information about regulatory compliance and certifications.</p>
                </CardContent>
              </Card>

              {/* Troubleshooting */}
              <Card>
                <CardHeader>
                  <CardTitle>Troubleshooting</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <h3 className="font-semibold">Common Issues</h3>
                  <p className="text-gray-600">Solutions to frequently encountered problems.</p>
                  <h3 className="font-semibold">Support Resources</h3>
                  <p className="text-gray-600">Additional resources and ways to get help.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Documentation;
