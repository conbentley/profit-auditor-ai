
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import StatCard from "@/components/Dashboard/StatCard";
import { BarChart3, ShoppingCart, DollarSign, Package } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function EcommerceOverview() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['ecommerce-stats'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Fetch product stats
      const { data: products } = await supabase
        .from('ecommerce_products')
        .select('id, price, inventory_quantity')
        .eq('user_id', user.id);

      // Fetch sales stats
      const { data: sales } = await supabase
        .from('ecommerce_sales')
        .select('total_price, quantity')
        .eq('user_id', user.id);

      const totalProducts = products?.length || 0;
      const totalInventory = products?.reduce((sum, p) => sum + (p.inventory_quantity || 0), 0) || 0;
      const totalRevenue = sales?.reduce((sum, s) => sum + Number(s.total_price), 0) || 0;
      const totalSales = sales?.reduce((sum, s) => sum + s.quantity, 0) || 0;

      return {
        totalProducts,
        totalInventory,
        totalRevenue,
        totalSales,
      };
    },
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard
        title="Total Products"
        value={stats?.totalProducts || 0}
        icon={Package}
        isLoading={isLoading}
      />
      <StatCard
        title="Total Inventory"
        value={stats?.totalInventory || 0}
        icon={ShoppingCart}
        isLoading={isLoading}
      />
      <StatCard
        title="Total Sales"
        value={stats?.totalSales || 0}
        icon={BarChart3}
        isLoading={isLoading}
      />
      <StatCard
        title="Total Revenue"
        value={`$${(stats?.totalRevenue || 0).toFixed(2)}`}
        icon={DollarSign}
        isLoading={isLoading}
      />
    </div>
  );
}
