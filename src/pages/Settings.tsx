
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Dashboard/Header";
import Sidebar from "@/components/Dashboard/Sidebar";
import { Card } from "@/components/ui/card";
import SecuritySettings from "@/components/Settings/SecuritySettings";

export default function Settings() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-6">
          <Card className="p-6">
            <h2 className="text-2xl font-semibold mb-6">Settings</h2>
            
            <Tabs defaultValue="security" className="space-y-6">
              <TabsList>
                <TabsTrigger value="security">Security & Privacy</TabsTrigger>
              </TabsList>

              <TabsContent value="security" className="space-y-6">
                <SecuritySettings />
              </TabsContent>
            </Tabs>
          </Card>
        </main>
      </div>
    </div>
  );
}
