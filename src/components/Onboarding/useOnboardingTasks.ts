
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Task } from "./types";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export function useOnboardingTasks() {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: 'integrations',
      title: 'Connect Your Data',
      description: 'Start by connecting your financial platforms or uploading spreadsheets through the integrations page.',
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
      route: '/ai-profit-assistant',
      isCompleted: false,
      requiredTask: 'audit',
    },
  ]);

  const checkIntegrations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: financialIntegrations } = await supabase
        .from('financial_integrations')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      const { data: crmIntegrations } = await supabase
        .from('crm_integrations')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      const { data: ecommerceIntegrations } = await supabase
        .from('ecommerce_integrations')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      const { data: spreadsheetUploads } = await supabase
        .from('spreadsheet_uploads')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      const hasIntegrations = (financialIntegrations && financialIntegrations.length > 0) ||
                            (crmIntegrations && crmIntegrations.length > 0) ||
                            (ecommerceIntegrations && ecommerceIntegrations.length > 0) ||
                            (spreadsheetUploads && spreadsheetUploads.length > 0);

      if (hasIntegrations) {
        await handleTaskCompletion('integrations', '/integrations', true);
      }
    } catch (error) {
      console.error('Error checking integrations:', error);
    }
  };

  const fetchOnboardingProgress = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
  };

  const handleTaskCompletion = async (taskId: string, route: string, skipNavigation = false) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in first');
        return;
      }

      if (taskId === 'audit' && !skipNavigation) {
        setIsGenerating(true);
        const currentDate = new Date();
        
        try {
          const response = await supabase.functions.invoke('generate-audit', {
            body: {
              user_id: user.id,
              month: currentDate.getMonth() + 1,
              year: currentDate.getFullYear(),
            },
          });

          if (response.error) {
            throw response.error;
          }

          queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
          queryClient.invalidateQueries({ queryKey: ['latest-audit'] });
          
          toast.success('Audit generated successfully');
          
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              completed_onboarding_tasks: [...(tasks.find(t => t.isCompleted)?.id ? [tasks.find(t => t.isCompleted)?.id] : []), taskId]
            })
            .eq('id', user.id);

          if (updateError) throw updateError;
          
          setTasks(prev => prev.map(task => ({
            ...task,
            isCompleted: task.id === taskId ? true : task.isCompleted
          })));
        } catch (error) {
          console.error('Error generating audit:', error);
          toast.error('Failed to generate audit');
        } finally {
          setIsGenerating(false);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Something went wrong');
    }
  };

  useEffect(() => {
    fetchOnboardingProgress();
  }, []);

  return {
    tasks,
    isLoading,
    isGenerating,
    handleTaskCompletion
  };
}
