
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface UserSettings {
  id: string;
  user_id: string;
  avatar_url: string | null;
  integrations: Record<string, any>;
  data_refresh_interval: string;
  audit_frequency: 'on_demand' | 'weekly' | 'monthly';
  audit_schedule_time: string;
  audit_schedule_day: number | null;
  kpi_thresholds: Record<string, number>;
  email_notifications: boolean;
  email_frequency: 'instant' | 'daily' | 'weekly';
  in_app_notifications: boolean;
  sms_notifications: boolean;
  phone_number: string | null;
  industry_benchmarks: Record<string, any>;
  target_kpis: Record<string, number>;
  ai_explanation_detail: 'basic' | 'intermediate' | 'advanced';
  dashboard_layout: 'grid' | 'list';
  theme: 'light' | 'dark' | 'system';
  language: string;
  two_factor_enabled: boolean;
  data_sharing_enabled: boolean;
  api_keys: Record<string, string>;
  api_usage_stats: Record<string, any>;
}

export function useUserSettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['user-settings'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data as UserSettings;
    }
  });

  const updateSettings = useMutation({
    mutationFn: async (newSettings: Partial<UserSettings>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('user_settings')
        .update(newSettings)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
      toast.success("Settings updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update settings: " + error.message);
    }
  });

  return {
    settings,
    isLoading,
    updateSettings: updateSettings.mutate,
    isUpdating: updateSettings.isPending
  };
}
