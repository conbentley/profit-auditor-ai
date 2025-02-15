
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function SalesHistory() {
  const { data: sales, isLoading } = useQuery({
    queryKey: ['ecommerce-sales'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('ecommerce_sales')
        .select(`
          *,
          ecommerce_products (name)
        `)
        .eq('user_id', user.id)
        .order('sale_date', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <Card className="p-4">
        <Skeleton className="h-8 w-64 mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Recent Sales</h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Order ID</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Unit Price</TableHead>
              <TableHead>Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales?.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell>{format(new Date(sale.sale_date), 'MMM d, yyyy')}</TableCell>
                <TableCell>{sale.order_id}</TableCell>
                <TableCell>{sale.ecommerce_products?.name}</TableCell>
                <TableCell>{sale.quantity}</TableCell>
                <TableCell>{`${sale.currency} ${sale.unit_price}`}</TableCell>
                <TableCell>{`${sale.currency} ${sale.total_price}`}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
