
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface UserSettings {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  company_name: string | null;
  company_website: string | null;
  job_title: string | null;
  phone_number: string | null;
  bio: string | null;
  city: string | null;
  country: string | null;
  timezone: string;
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

      console.log("Fetching settings for user:", user.id);

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error("Error fetching settings:", error);
        throw error;
      }

      console.log("Current settings:", data);

      if (!data) {
        console.log("No settings found, creating default settings");
        // Ensure all required fields are included in defaultSettings
        const defaultSettings = {
          user_id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || null,
          company_name: null,
          company_website: null,
          job_title: null,
          phone_number: null,
          bio: null,
          city: null,
          country: null,
          timezone: 'UTC',
          avatar_url: null,
          integrations: {},
          data_refresh_interval: '1h',
          audit_frequency: 'on_demand' as const,
          audit_schedule_time: '09:00',
          audit_schedule_day: null,
          kpi_thresholds: {},
          email_notifications: true,
          email_frequency: 'daily' as const,
          in_app_notifications: true,
          sms_notifications: false,
          industry_benchmarks: {},
          target_kpis: {},
          ai_explanation_detail: 'intermediate' as const,
          dashboard_layout: 'grid' as const,
          theme: 'system' as const,
          language: 'en',
          two_factor_enabled: false,
          data_sharing_enabled: false,
          api_keys: {},
          api_usage_stats: {}
        } satisfies Omit<UserSettings, 'id'>;

        const { data: newSettings, error: createError } = await supabase
          .from('user_settings')
          .insert([defaultSettings])
          .select('*')
          .single();

        if (createError) {
          console.error("Error creating settings:", createError);
          throw createError;
        }

        return newSettings as UserSettings;
      }

      return {
        ...data,
        company_name: data.company_name || null
      } as UserSettings;
    }
  });

  const updateSettings = useMutation({
    mutationFn: async (newSettings: Partial<UserSettings>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      console.log("Updating settings with:", newSettings);

      const { data, error } = await supabase
        .from('user_settings')
        .update(newSettings)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error("Error updating settings:", error);
        throw error;
      }

      if (!data) {
        throw new Error("No data returned after update");
      }

      return {
        ...data,
        company_name: data.company_name || null
      } as UserSettings;
    },
    onSuccess: () => {
      console.log("Settings updated successfully");
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
      toast.success("Settings updated successfully");
    },
    onError: (error: Error) => {
      console.error("Settings update failed:", error);
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
