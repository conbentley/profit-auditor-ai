
import { Card } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { formatCurrency } from "@/lib/formatters";

interface CashFlowChartProps {
  data: Array<{
    date: string;
    amount: number;
  }>;
}

export default function CashFlowChart({ data }: CashFlowChartProps) {
  return (
    <Card className="p-6 w-full h-full lg:col-span-2">
      <h2 className="text-lg font-medium mb-4">Cash Flow Analysis</h2>
      <div className="w-full h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(value) => formatCurrency(value)} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend />
            <Bar 
              dataKey="amount" 
              name="Net Cash Flow"
              fill="#8884d8"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
