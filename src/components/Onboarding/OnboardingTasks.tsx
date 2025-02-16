
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
}

type OnboardingData = {
  user_id: string;
  completed_tasks: string[];
  is_completed: boolean;
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
      route: '/',
      isCompleted: false,
    },
    {
      id: 'chat',
      title: 'Chat with AI Profit Assistant',
      description: 'Ask questions about your audit and get detailed insights from our AI assistant.',
      route: '/ai-profit-chat',
      isCompleted: false,
    },
  ]);

  useEffect(() => {
    async function fetchOnboardingProgress() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('profiles')
          .select('completed_onboarding_tasks')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        if (data) {
          setTasks(prev => prev.map(task => ({
            ...task,
            isCompleted: data.completed_onboarding_tasks?.includes(task.id) ?? false
          })));
        }
      } catch (error) {
        console.error('Error fetching onboarding progress:', error);
        toast.error('Failed to load onboarding progress');
      } finally {
        setIsLoading(false);
      }
    }

    fetchOnboardingProgress();
  }, []);

  const handleTaskClick = async (taskId: string, route: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get current tasks
      const { data: currentData, error: fetchError } = await supabase
        .from('profiles')
        .select('completed_onboarding_tasks')
        .eq('id', user.id)
        .single();

      if (fetchError) throw fetchError;

      // Update tasks array
      const updatedTasks = Array.from(new Set([
        ...(currentData?.completed_onboarding_tasks || []),
        taskId
      ]));

      // Update the profile with new tasks
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          completed_onboarding_tasks: updatedTasks,
          is_onboarded: updatedTasks.length === tasks.length
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, isCompleted: true } : task
      ));

      navigate(route);
    } catch (error) {
      console.error('Error updating task progress:', error);
      toast.error('Failed to update progress');
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
        {tasks.map((task) => (
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
              >
                {task.isCompleted ? 'Completed - View Again' : 'Get Started'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
