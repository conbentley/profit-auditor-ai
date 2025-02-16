
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, Circle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
  description: string;
  route: string;
  isCompleted: boolean;
  requiredTask?: string;
}

interface Profile {
  id: string;
  completed_onboarding_tasks: string[];
  is_onboarded: boolean;
}

export default function OnboardingTasks() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: 'integrations',
      title: 'Connect Your APIs',
      description: 'Start by connecting your financial, CRM, or e-commerce platforms through the integrations page.',
      route: '/integrations',
      isCompleted: false,
    },
    {
      id: 'audit',
      title: 'Generate Your First Audit',
      description: 'Generate an AI-powered audit of your business performance from the dashboard.',
      route: '/dashboard',
      isCompleted: false,
      requiredTask: 'integrations',
    },
    {
      id: 'chat',
      title: 'Chat with AI Profit Assistant',
      description: 'Ask questions about your audit and get detailed insights from our AI assistant.',
      route: '/chat',
      isCompleted: false,
    },
  ]);

  useEffect(() => {
    async function checkIntegrations() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Check for any existing integrations
        const { data: financialIntegrations, error: financialError } = await supabase
          .from('financial_integrations')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        const { data: crmIntegrations, error: crmError } = await supabase
          .from('crm_integrations')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        const { data: ecommerceIntegrations, error: ecommerceError } = await supabase
          .from('ecommerce_integrations')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        if (financialError || crmError || ecommerceError) {
          throw new Error('Failed to check integrations');
        }

        const hasIntegrations = (financialIntegrations && financialIntegrations.length > 0) ||
                              (crmIntegrations && crmIntegrations.length > 0) ||
                              (ecommerceIntegrations && ecommerceIntegrations.length > 0);

        if (hasIntegrations) {
          handleTaskClick('integrations', '/integrations', true);
        }
      } catch (error) {
        console.error('Error checking integrations:', error);
      }
    }

    async function fetchOnboardingProgress() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get the profile with completed tasks
        const { data, error } = await supabase
          .from('profiles')
          .select('completed_onboarding_tasks')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          return;
        }

        if (data && data.completed_onboarding_tasks) {
          setTasks(prev => prev.map(task => ({
            ...task,
            isCompleted: data.completed_onboarding_tasks.includes(task.id)
          })));
        }

        await checkIntegrations();
      } catch (error) {
        console.error('Error fetching onboarding progress:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchOnboardingProgress();
  }, []);

  const handleTaskClick = async (taskId: string, route: string, skipNavigation = false) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in first');
        return;
      }

      // Simple navigation for now - we'll update the completion status later
      if (!skipNavigation) {
        navigate(route);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Something went wrong');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-semibold mb-6">Welcome! Let's get you started</h2>
      <div className="space-y-6">
        {tasks.map((task) => {
          const requiredTask = task.requiredTask ? tasks.find(t => t.id === task.requiredTask) : null;
          const isDisabled = requiredTask && !requiredTask.isCompleted;

          return (
            <div key={task.id} className="flex items-start gap-4">
              <div className="mt-1">
                {task.isCompleted ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                ) : (
                  <Circle className="w-6 h-6 text-gray-300" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium">{task.title}</h3>
                <p className="text-gray-500 mb-2">{task.description}</p>
                <Button 
                  variant={task.isCompleted ? "outline" : "default"}
                  onClick={() => handleTaskClick(task.id, task.route)}
                  disabled={isDisabled}
                >
                  {task.isCompleted ? 'Completed - View Again' : 'Get Started'}
                </Button>
                {isDisabled && (
                  <p className="text-sm text-orange-600 mt-1">
                    Complete "{requiredTask?.title}" first
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
