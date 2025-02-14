
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAnalyticsData() {
  return useQuery({
    queryKey: ['analytics-transactions'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);

      const { data, error } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('transaction_date', startDate.toISOString())
        .order('transaction_date', { ascending: true });

      if (error) throw error;
      return data;
    }
  });
}
